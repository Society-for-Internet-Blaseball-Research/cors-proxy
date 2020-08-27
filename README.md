# blaseball-cors-proxy

This is an AWS CDK app that deploys a proxy to enable cross-origin requests to Blaseball's read-only endpoints under `/database` and `/events`.

The proxy is a CloudFront distribution with Lambda@Edge functions to generate and modify responses as necessary.

Prior to Season 4, Blaseball's backend returned the `Access-Control-Allow-Origin: *` header, allowing websites to make unauthenticated cross-origin requests.
This was useful for third-party websites that display various information directly from the backend.
Starting in Season 4, Blaseball's backend changed significantly, and the `Access-Control-Allow-Origin` header was dropped.

We aren't sure if this change in behavior was deliberate or not.
This proxy is designed to be able to replace the current proxy logic with new redirect logic, without breaking consumers, if cross-origin headers return.
