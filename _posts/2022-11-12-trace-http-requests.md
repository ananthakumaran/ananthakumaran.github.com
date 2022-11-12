---
layout: post
title: Tracing HTTP Requests with tcpflow
tags: debugging
date: 2022-11-12 10:29 +0530
---
PagerDuty went off very early in the morning, and our hero cursed his
bad luck and received the phone call. He made PagerDuty repeat the
message twice, but couldn't understand the message. He pressed the
number to acknowledge the incident. He opened the MacBook and found
the slack message from the PagerDuty bot more informative. He clicked
the link and it took him to a Grafana Dashboard.

He stared at the red heart icon for a few seconds, there was a high
failure rate on one of the microservices. For a second, he was tempted
to update the error threshold, so he can get back to
sleep. Grudgingly, he opened the Graylog and looked at the logs, and
noticed 401 responses. He dug around the logs for more information but
found nothing useful.

He connected to the production VPN and entered one of the k8s pods
using kubectl exec. He wanted to look at the raw HTTP request, but he
didn't remember the port number the server was listening to.

```text
$ ss -lp
Netid          State                      Local Address:Port     Peer Address:Port
nl             UNCONN                           tcpdiag:kernel               *
nl             UNCONN                           tcpdiag:ss/1355              *
nl             UNCONN                              genl:kernel               *
u_str          LISTEN  /tmp/puma-status-1667909371846-1 403125              * 0             users:(("ruby",pid=68,fd=12),("ruby",pid=58,fd=12),("ruby",pid=1,fd=12))
tcp            LISTEN                           0.0.0.0:8000          0.0.0.0:*             users:(("ruby",pid=68,fd=5),("ruby",pid=58,fd=5),("ruby",pid=1,fd=5))
tcp            LISTEN                           0.0.0.0:9394          0.0.0.0:*             users:(("ruby",pid=1,fd=20))
```

`ss` is the Swiss army knife for sockets. The flag -l stands for
listen and -p stands for processes. He asked the system for all the
sockets which were listening on any port with the process level
details. Once he looked at the output, he knew the server was
listening on `8000`. Still groggy, he ran

```text
$ tcpflow -c -e http dst port 8000

100.100.102.033.47106-100.100.102.017.08000: GET /api/me HTTP/1.1
Host: www.ananthakumaran.in
X-Request-ID: b061642af69518f68315242ee8ef330c
X-Real-IP: 127.0.0.1
X-Forwarded-For: 127.0.0.1
X-Forwarded-Host: www.ananthakumaran.in
X-Forwarded-Port: 80
X-Forwarded-Proto: http
X-Forwarded-Scheme: http
X-Scheme: http
X-Forwarded-Proto: https
X-Forwarded-Ssl: on
sec-ch-ua: "Chromium";v="104", " Not A;Brand";v="99", "Google Chrome";v="104"
Accept: application/json
sec-ch-ua-mobile: ?0
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36
sec-ch-ua-platform: "Linux"
Sec-Fetch-Site: same-site
Sec-Fetch-Mode: cors
Sec-Fetch-Dest: empty
Referer: https://ananthakumaran.in/
Accept-Encoding: gzip, deflate, br
Accept-Language: en-US,en;q=0.9,hi;q=0.8,ta;q=0.7
If-None-Match: W/"2b41babef3e0d190ded246a5843cda02"


100.105.004.216.50720-100.100.102.017.08000: GET /api/transactions HTTP/1.1
Host: www.ananthakumaran.in
X-Request-ID: 9f7ed9688726fa3477c769138c87f448
X-Real-IP: 127.0.0.1
X-Forwarded-For: 127.0.0.1
X-Forwarded-Host: www.ananthakumaran.in
X-Forwarded-Port: 80
X-Forwarded-Proto: http
X-Forwarded-Scheme: http
X-Scheme: http
X-Forwarded-Proto: https
X-Forwarded-Ssl: on
Accept-Encoding: gzip;q=1.0,deflate;q=0.6,identity;q=0.3
Accept: application/json
User-Agent: Ruby
Content-Type: application/json
Authorization: Bearer 000000000000000


172.025.038.179.38652-100.100.102.017.08000: GET /healthcheck HTTP/1.1
Host: 100.100.102.17:8000
User-Agent: kube-probe/1.19
Accept-Encoding: gzip
Connection: close
```

`tcpflow` can analyze the data transmitted via tcp sockets. It can
look at any live tcp socket and show the back and forth
communication. You might think, this sounds very similar to `tcpdump`,
it is, with one twist, it understands the HTTP protocol and shows the
HTTP request and response in a meaningful way. The flag -c sends all
the output to stdout, without that, multiple files will be created
representing the request, response, and decoded body. It can decode
gzip encoded response as well.

```text
127.000.000.001.04001-127.000.000.001.33378
127.000.000.001.04001-127.000.000.001.33378-HTTPBODY-001.json
127.000.000.001.33378-127.000.000.001.04001
```

Let's get back to our story. He quickly realized his mistake once he
saw the wall of text scrolling by. He was interested in only one API
endpoint.

```text
$ tcpflow -c -e http dst port 8000 | grep -A 15 "GET /api/transactions"
reportfilename: ./report.xml
tcpflow: listening on eth0
100.105.004.216.50720-100.100.102.017.08000: GET /api/transactions?investor_id=000000000000000 HTTP/1.1
Host: ananthakumaran.in
X-Request-ID: 7adce1452bfd292d587888df58db470e
X-Real-IP: 172.25.79.86
X-Forwarded-For: 172.25.79.86
X-Forwarded-Host: ananthakumaran.in
X-Forwarded-Port: 80
X-Forwarded-Proto: http
X-Forwarded-Scheme: http
X-Scheme: http
X-Forwarded-Proto: https
X-Forwarded-Ssl: on
Accept-Encoding: gzip;q=1.0,deflate;q=0.6,identity;q=0.3
Accept: application/json
User-Agent: Ruby
Content-Type: application/json
Authorization: Bearer 000000000000000
```

He looked at the bearer token and suddenly everything became clear to
him. They rotated the API keys last week and the grace period for the
old keys finished yesterday but one of the clients was still using the
expired key. He sent a slack message to the project channel and went
back to his sleep, glad that he need not fix anything.

<link rel="stylesheet" href="/public/css/trace-http-requests.css"/>
