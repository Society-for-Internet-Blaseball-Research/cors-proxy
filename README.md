# blaseball-cors-proxy

## Usage

You can use this proxy to make cross-origin requests. You do not need to request permission. Please do not abuse the service, as abuse will likely be proxied onto the origin and then we'll all lose access :)

Replace `www.blaseball.com` in your endpoint URL with `cors-proxy.blaseball-reference.com`, and it should just work.

Endpoints under `/database` and `/events` are supported. Directly accessing the proxy is not supported (requests must have an `Origin` or `X-Requested-With` header).

If you are accessing an event source under `/events`, plan to add code to re-open the socket after the connection is closed.

If you have questions, come ask them in #projects on the SIBR Discord (see [our GitHub page](https://github.com/Society-for-Internet-Blaseball-Research) for an invite link).

## About

This is an AWS CDK app that deploys a proxy to enable cross-origin requests to Blaseball's read-only endpoints under `/database` and `/events`.

The proxy is a CloudFront distribution with Lambda@Edge functions to generate and modify responses as necessary.

Prior to Season 4, Blaseball's backend returned the `Access-Control-Allow-Origin: *` header, allowing websites to make unauthenticated cross-origin requests.
This was useful for third-party websites that display various information directly from the backend.
Starting in Season 4, Blaseball's backend changed significantly, and the `Access-Control-Allow-Origin` header was dropped.

We aren't sure if this change in behavior was deliberate or not.
This proxy is designed to be able to replace the current proxy logic with new redirect logic, without breaking consumers, if cross-origin headers return.
