/* eslint-disable no-param-reassign */

import {
  CloudFrontHeaders, CloudFrontRequest, CloudFrontRequestHandler, CloudFrontResponseHandler,
  CloudFrontResultResponse,
} from 'aws-lambda';

function getHeader(headers: CloudFrontHeaders, needle: string): string | undefined {
  return Object.entries(headers)
    .find(([k]) => k.toLowerCase() === needle.toLowerCase())?.[1][0].value;
}

function addHeader(headers: CloudFrontHeaders, key: string, value: string | undefined):
CloudFrontHeaders {
  if (value !== undefined) {
    headers[key] = [{ key, value }];
  }
  return headers;
}

function removeHeader(headers: CloudFrontHeaders, remove: string) {
  Object.keys(headers).forEach((name) => {
    if (name.toLowerCase() === remove.toLowerCase()) {
      delete headers[name];
    }
  });
}

function addCors(headers: CloudFrontHeaders, request: CloudFrontRequest): CloudFrontHeaders {
  addHeader(headers, 'access-control-allow-origin', '*');
  addHeader(headers, 'access-control-allow-methods', getHeader(request.headers, 'access-control-request-method'));
  addHeader(headers, 'access-control-allow-headers', getHeader(request.headers, 'access-control-request-headers'));
  return headers;
}

function textResponse(status: string, body: string): CloudFrontResultResponse {
  const headers = addHeader({}, 'content-type', 'text/plain; charset=UTF-8');
  return { status, body, headers };
}

export const onRequest: CloudFrontRequestHandler = async (event) => {
  const { request } = event.Records[0].cf;

  if (request.uri === '/') {
    const body = 'This API enables cross-origin requests to read-only Blaseball endpoints (/database and /events).\n\n'
          + 'Cookies are disabled and stripped from requests. Redirects are not followed, as they should be\n'
          + 'handled by the browser.\n\n'
          + 'To prevent the use of the proxy for casual browsing, the API requires either the Origin or the\n'
          + 'X-Requested-With header to be set. To avoid unnecessary preflight (OPTIONS) requests, it\'s\n'
          + 'recommended to not manually set these headers in your code.\n';
    return textResponse('200', body);
  }

  if (!['/events', '/database'].some((s) => request.uri.startsWith(s))) {
    return textResponse('404', '404 Not Found');
  }

  if (!Object.keys(request.headers).some((k) => ['origin', 'x-requested-with'].includes(k.toLowerCase()))) {
    return textResponse('400', 'Requests must set either the Origin or X-Requested-With header.');
  }

  if (request.method === 'OPTIONS') {
    return { status: '204', headers: addCors({}, request) };
  }

  removeHeader(request.headers, 'cookie');
  return request;
};

export const onResponse: CloudFrontResponseHandler = async (event) => {
  const { request, response } = event.Records[0].cf;
  const headers = addCors(response.headers, request);
  if (request.uri.startsWith('/events')) {
    addHeader(headers, 'cache-control', 'no-store, must-revalidate');
  }
  removeHeader(headers, 'set-cookie');
  removeHeader(headers, 'set-cookie2');
  return response;
};
