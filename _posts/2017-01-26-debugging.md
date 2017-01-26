---
layout: post
title: Debugging cryptic errors
---

At a project I am working on, our backend system makes http requests
to hundreds of different servers. It is sort of like webhook, http
requests are made to the customer server with the payload whenever
some specific events occur in our system. We are in the midst of
migrating our systems from ruby to elixir.

During the test run, we started to get a cryptic error for some small
number of domains.

```elixir
HTTPoison.get("https://piay.iflix.com", [], [proxy: {'10.128.10.16', 3128}])
# => timestamp=2017-01-02T04:11:00.816Z level=error message= SSL: :hello:ssl_alert.erl:88:Fatal error: handshake failure

# => {:error, %HTTPoison.Error{id: nil, reason: {:tls_alert, 'handshake failure'}}}
```

The error points out that the handshake phase during the ssl
connection is failing. But it doesn't say why it is failing.

To get more information, I tried to use ssl module directly.

```elixir
:ssl.connect('piay.iflix.com', 443, [])
# => {:ok,{:sslsocket, {:gen_tcp, #Port<0.10658>, :tls_connection, :undefined}, #PID<0.325.0>}}
```

To my amazement, it worked. I was able to connect to this domain, but
https request failed. Due to compliance reasons, we have to use a
proxy server for all our outgoing http/https requests. We use
`HTTPoison` library, which is a wrapper for `hackney` library. We
already had some issues due to proxy. It seems like most of the users
of the hackney library don't use the proxy option, so some of the code
paths related to proxy are not well tested. To make sure proxy is the
problem, I made the request without proxy option and it worked.

Hackney uses
[connect tunneling](https://en.wikipedia.org/wiki/HTTP_tunnel#HTTP_CONNECT_tunneling)
method, which is quite simple. The http client sends `CONNECT
piay.iflix.com:443` to the proxy server, which in turn opens a tcp
connection to `piay.iflix.com:443`. The proxy server will then relay
whatever data sent by http client to the destination server. In case
of https request, once the connection is established, hackney
initiates the ssl protocol using `ssl:connect` method.

This looks quite simple, but still something is going wrong. The same
`ssl:connect` succeeds when it is established directly, but not
through the proxy server.

The [dbg](http://erlang.org/doc/man/dbg.html) app provides text based
tracing functionality. It can be used to trace function at various
granularities, from all the functions in a module to a function with
specific arguments. I started to trace all the function calls in ssl
module, but it resulted in too much data for me to analyze
properly. Then I started to read the source code of `ssl` app and
started to trace a single function at a time and compared the
arguments and the results of successful and failed connection.

```plain
(<0.572.0>) returned from ssl_handshake:client_hello_extensions/6 -> 
{hello_extensions,
 {renegotiation_info,
  {elliptic_curves,
   {1,3,
    132,
    0,
    30}]},
 undefined}


(<0.572.0>) returned from ssl_handshake:client_hello_extensions/6 -> 
{hello_extensions,
 {renegotiation_info,
  {elliptic_curves,
   {1,3,
    132,
    0,
    30}]},
 {sni,
  "piay.iflix.com"}}
```

After multiple trials and errors, I finally came across something
interesting. The `sni` field was present in successful connection, but
not in failed connection. The rest of the deduction was easy. The sni
[extension](https://en.wikipedia.org/wiki/Server_Name_Indication)
allows a single server to serve different certificates for different
domains. During the initial handshake, the client has to provide the
domain name along with other details.

If a host name is passed as the first param of `ssl:connect`, the sni
extension is automatically enabled. For proxy request, the connection
is established to the proxy server, which relays the data to the
destination server. As the ip address of the proxy server is passed as
the first param, sni extension was not enabled.

```elixir
HTTPoison.get("https://piay.iflix.com", [], [proxy: {'10.128.10.16', 3128}, ssl: [server_name_indication: 'piay.iflix.com']])
```
The fix was easy. The sni extension has to be enabled explicitly. As
always, more layers introduce more points of failures.
