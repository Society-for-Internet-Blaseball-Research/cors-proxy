# Blaseball CORS proxy

## Usage

You can use this proxy to make cross-origin requests to certain Blaseball endpoints. You do not need to request permission. Please do not abuse the service, as abuse will likely be proxied onto the origin and then we'll all lose access :)

Replace `www.blaseball.com` in your endpoint URL with `cors-proxy.blaseball-reference.com`, and it should just work.

Endpoints under `/database` and `/events` are supported, as are `/api/getIdols` and `/api/getTribute`. Directly accessing the proxy is not supported (requests must have an `Origin` header).

If you have questions, come ask them in #projects on the SIBR Discord (see [sibr.dev](https://sibr.dev) for an invite link).
