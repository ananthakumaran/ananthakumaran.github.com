---
layout: post
title: Sad Servers
container: sad-servers
date: 2023-10-29
---
I recently came across the website called [sadservers](https://sadservers.com/scenarios). When I
checked the site, there were 28 problems, each presenting a broken
server. These issues could be caused by misconfiguration, a filled
disk, or any other operational problem. Your task is to fix the
server.

I am sharing my solutions to some of the problems. This is a edited
version of my interaction with the server.

### 1. "Saint John": what is writing to this log file?

<span class='prompt'>ubuntu@ip-172-31-32-108:/$</span><code class='command'> lsof | grep bad.log</code>
```
badlog.py  614                         ubuntu    3w      REG              259,1    12946  67701 /var/log/bad.log
```
<span class='prompt'>ubuntu@ip-172-31-32-108:/$</span><code class='command'> ps -p 614</code>
```
    PID TTY          TIME CMD
    614 ?        00:00:00 badlog.py
```
<span class='prompt'>ubuntu@ip-172-31-32-108:/$</span><code class='command'> kill 614</code>

<span class='prompt'>ubuntu@ip-172-31-32-108:/$</span><code class='command'> ps -p 614</code>
```
    PID TTY          TIME CMD
```

### 2. "Saskatoon": counting IPs


<span class='prompt'>admin@ip-172-31-27-155:/$</span><code class='command'> cat /home/admin/access.log | cut -d ' ' -f 1 | sort | uniq -c | sort -nr | head</code>
```
    482 66.249.73.135
    364 46.105.14.53
    357 130.237.218.86
    273 75.97.9.59
    113 50.16.19.13
    102 209.85.238.199
     99 68.180.224.225
     84 100.43.83.137
     83 208.115.111.72
     82 198.46.149.143
```
<span class='prompt'>admin@ip-172-31-27-155:/$</span><code class='command'> echo "66.249.73.135" > /home/admin/highestip.txt</code>

<span class='prompt'>admin@ip-172-31-27-155:/$</span><code class='command'> sha1sum /home/admin/highestip.txt</code>
```
6ef426c40652babc0d081d438b9f353709008e93  /home/admin/highestip.txt
```

### 3. "Santiago": Find the secret combination

<span class='prompt'>admin@ip-172-31-39-212:~$</span><code class='command'> grep "Alice" *.txt | wc -l</code>
```
411
```
<span class='prompt'>admin@ip-172-31-39-212:~$</span><code class='command'> grep -A 1 "Alice" *.txt</code>
```
11-0.txt:First, she dreamed of little Alice herself, and once again the tiny
11-0.txt-hands were clasped upon her knee, and the bright eager eyes were
--
1342-0.txt:                                Alice
1342-0.txt-                        156 CHARING CROSS ROAD
--
1661-0.txt:Alice the shock. And now I will make the thing clear to you; it has
1661-0.txt-been a long time in the acting, but will not take me long to tell.
--
1661-0.txt:though my wife died young she left me my dear little Alice. Even when
1661-0.txt-she was just a baby her wee hand seemed to lead me down the right path
--
1661-0.txt:as Alice grew up, for he soon saw I was more afraid of her knowing my
1661-0.txt-past than of the police. Whatever he wanted he must have, and whatever
--
1661-0.txt:he asked a thing which I could not give. He asked for Alice.
1661-0.txt-
--
```
<span class='prompt'>admin@ip-172-31-39-212:~$</span><code class='command'> echo 411156 > /home/admin/solution</code>


### 4. "Manhattan": can't write data into database.

<span class='prompt'>root@ip-172-31-38-154:/#</span><code class='command'> sudo -u postgres psql -c "insert into persons(name) values ('jane smith');" -d dt</code>
```
psql: error: connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed: No such file or directory
        Is the server running locally and accepting connections on that socket?
```
<span class='prompt'>root@ip-172-31-38-154:/#</span><code class='command'> ps -ef | grep post</code>
```
root       774   769  0 12:12 pts/0    00:00:00 grep post
```
<span class='prompt'>root@ip-172-31-38-154:/#</span><code class='command'> systemctl | grep post</code>
```
  postgresql.service                                                       loaded active exited    PostgreSQL RDBMS
● postgresql@14-main.service                                               loaded failed failed    PostgreSQL Cluster 14-main
  system-postgresql.slice                                                  loaded active active    system-postgresql.slice
```
<span class='prompt'>root@ip-172-31-38-154:/#</span><code class='command'> systemctl</code>
```
```
<span class='prompt'>root@ip-172-31-38-154:/#</span><code class='command'> journalctl -u 'postgresql@14-main.service'</code>
```
-- Logs begin at Sat 2023-02-04 12:10:45 UTC, end at Sat 2023-02-04 12:13:38 UTC. --
Feb 04 12:11:40 ip-172-31-38-154 systemd[1]: Starting PostgreSQL Cluster 14-main...
Feb 04 12:11:40 ip-172-31-38-154 postgresql@14-main[585]: Error: /usr/lib/postgresql/14/bin/pg_ctl /usr/lib/postgresql/14/bin/pg_ctl start -D /opt/pgdata/main -l /var/log/postgresql/postgresql-14-main.log -s -o
Feb 04 12:11:40 ip-172-31-38-154 postgresql@14-main[585]: 2023-02-04 12:11:40.886 UTC [651] FATAL:  could not create lock file "postmaster.pid": No space left on device
Feb 04 12:11:40 ip-172-31-38-154 postgresql@14-main[585]: pg_ctl: could not start server
Feb 04 12:11:40 ip-172-31-38-154 postgresql@14-main[585]: Examine the log output.
Feb 04 12:11:40 ip-172-31-38-154 systemd[1]: postgresql@14-main.service: Can't open PID file /run/postgresql/14-main.pid (yet?) after start: No such file or directory
Feb 04 12:11:40 ip-172-31-38-154 systemd[1]: postgresql@14-main.service: Failed with result 'protocol'.
Feb 04 12:11:40 ip-172-31-38-154 systemd[1]: Failed to start PostgreSQL Cluster 14-main.
```
<span class='prompt'>root@ip-172-31-38-154:/var#</span><code class='command'> df -h</code>
```
Filesystem       Size  Used Avail Use% Mounted on
udev             224M     0  224M   0% /dev
tmpfs             47M  1.5M   46M   4% /run
/dev/nvme1n1p1   7.7G  1.2G  6.1G  17% /
tmpfs            233M     0  233M   0% /dev/shm
tmpfs            5.0M     0  5.0M   0% /run/lock
tmpfs            233M     0  233M   0% /sys/fs/cgroup
/dev/nvme1n1p15  124M  278K  124M   1% /boot/efi
/dev/nvme0n1     8.0G  8.0G   28K 100% /opt/pgdata
```
<span class='prompt'>root@ip-172-31-38-154:/var#</span><code class='command'> cd /opt/pgdata</code>
```
```
<span class='prompt'>root@ip-172-31-38-154:/opt/pgdata#</span><code class='command'> ls -ltrh</code>
```
total 8.0G
-rw-r--r--  1 root     root     7.0G May 21  2022 file1.bk
-rw-r--r--  1 root     root     923M May 21  2022 file2.bk
-rw-r--r--  1 root     root       69 May 21  2022 deleteme
-rw-r--r--  1 root     root     488K May 21  2022 file3.bk
drwx------ 19 postgres postgres 4.0K May 21  2022 main
```
<span class='prompt'>root@ip-172-31-38-154:/opt/pgdata#</span><code class='command'> rm file1.bk</code>
```
```
<span class='prompt'>root@ip-172-31-38-154:/opt/pgdata#</span><code class='command'> systemctl restart 'postgresql@14-main.service'</code>
```
```
<span class='prompt'>root@ip-172-31-38-154:/opt/pgdata#</span><code class='command'> journalctl -u 'postgresql@14-main.service'</code>
```
-- Logs begin at Sat 2023-02-04 12:10:45 UTC, end at Sat 2023-02-04 12:18:04 UTC. --
Feb 04 12:11:40 ip-172-31-38-154 systemd[1]: Starting PostgreSQL Cluster 14-main...
Feb 04 12:11:40 ip-172-31-38-154 postgresql@14-main[585]: Error: /usr/lib/postgresql/14/bin/pg_ctl /usr/lib/postgresql/14/bin/pg_ctl start -D /opt/pgdata/main -l /var/log/postgresql/postgresql-14-main.log -s -o
Feb 04 12:11:40 ip-172-31-38-154 postgresql@14-main[585]: 2023-02-04 12:11:40.886 UTC [651] FATAL:  could not create lock file "postmaster.pid": No space left on device
Feb 04 12:11:40 ip-172-31-38-154 postgresql@14-main[585]: pg_ctl: could not start server
Feb 04 12:11:40 ip-172-31-38-154 postgresql@14-main[585]: Examine the log output.
Feb 04 12:11:40 ip-172-31-38-154 systemd[1]: postgresql@14-main.service: Can't open PID file /run/postgresql/14-main.pid (yet?) after start: No such file or directory
Feb 04 12:11:40 ip-172-31-38-154 systemd[1]: postgresql@14-main.service: Failed with result 'protocol'.
Feb 04 12:11:40 ip-172-31-38-154 systemd[1]: Failed to start PostgreSQL Cluster 14-main.
Feb 04 12:18:02 ip-172-31-38-154 systemd[1]: Starting PostgreSQL Cluster 14-main...
Feb 04 12:18:04 ip-172-31-38-154 systemd[1]: Started PostgreSQL Cluster 14-main.
```
<span class='prompt'>root@ip-172-31-38-154:/opt/pgdata#</span><code class='command'> sudo -u postgres psql -c "insert into persons(name) values ('jane smith');" -d dt</code>
```
INSERT 0 1
```

### 5. "Tokyo": can't serve web file

<span class='prompt'>root@ip-172-31-21-14:/#</span><code class='command'> curl http://127.0.0.1</code>
```
^C
```
<span class='prompt'>root@ip-172-31-21-14:/#</span><code class='command'> curl -vvv http://127.0.0.1</code>
```
*   Trying 127.0.0.1:80...
^C
```
<span class='prompt'>root@ip-172-31-21-14:/#</span><code class='command'> ss -ltnp</code>
```
State          Recv-Q          Send-Q                   Local Address:Port                   Peer Address:Port         Process
LISTEN         0               4096                     127.0.0.53%lo:53                          0.0.0.0:*             users:(("systemd-resolve",pid=441,fd=14))
LISTEN         0               128                            0.0.0.0:22                          0.0.0.0:*             users:(("sshd",pid=649,fd=3))
LISTEN         0               4096                                 *:6767                              *:*             users:(("sadagent",pid=542,fd=7))
LISTEN         0               4096                                 *:8080                              *:*             users:(("gotty",pid=563,fd=6))
LISTEN         0               511                                  *:80                                *:*             users:(("apache2",pid=777,fd=4),("apache2",pid=776,fd=4),("apache2",pid=625,fd=4))
LISTEN         0               128                               [::]:22                             [::]:*             users:(("sshd",pid=649,fd=4))
```
<span class='prompt'>root@ip-172-31-21-14:/#</span><code class='command'> ifconfig</code>
```
ens5: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 9001
        inet 172.31.44.0  netmask 255.255.240.0  broadcast 172.31.47.255
        inet6 fe80::899:9cff:fe47:e8be  prefixlen 64  scopeid 0x20<link>
        ether 0a:99:9c:47:e8:be  txqueuelen 1000  (Ethernet)
        RX packets 478  bytes 46690 (46.6 KB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 590  bytes 246674 (246.6 KB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        inet6 ::1  prefixlen 128  scopeid 0x10<host>
        loop  txqueuelen 1000  (Local Loopback)
        RX packets 160  bytes 16071 (16.0 KB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 160  bytes 16071 (16.0 KB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

```
<span class='prompt'>root@ip-172-31-21-14:/#</span><code class='command'> tcpdump -i lo host 127.0.0.1 and port 80 &</code>
```
[1] 1180
```
<span class='prompt'>root@ip-172-31-21-14:/#</span><code class='command'> tcpdump: verbose output suppressed, use -v[v]... for full protocol decode</code>
```
listening on lo, link-type EN10MB (Ethernet), snapshot length 262144 bytes

```
<span class='prompt'>root@ip-172-31-21-14:/#</span><code class='command'> curl http://127.0.0.1</code>
```
13:55:06.877464 IP localhost.55438 > localhost.http: Flags [S], seq 2488977107, win 65495, options [mss 65495,sackOK,TS val 3439650683 ecr 0,nop,wscale 6], length 0
13:55:07.878701 IP localhost.55438 > localhost.http: Flags [S], seq 2488977107, win 65495, options [mss 65495,sackOK,TS val 3439651684 ecr 0,nop,wscale 6], length 0
13:55:09.894712 IP localhost.55438 > localhost.http: Flags [S], seq 2488977107, win 65495, options [mss 65495,sackOK,TS val 3439653700 ecr 0,nop,wscale 6], length 0
^C
```
<span class='prompt'>root@ip-172-31-21-14:/#</span><code class='command'> iptables --list</code>
```
Chain INPUT (policy ACCEPT)
target     prot opt source               destination
DROP       tcp  --  anywhere             anywhere             tcp dpt:http

Chain FORWARD (policy ACCEPT)
target     prot opt source               destination

Chain OUTPUT (policy ACCEPT)
target     prot opt source               destination
```
<span class='prompt'>root@ip-172-31-21-14:/#</span><code class='command'> iptables --list INPUT</code>
```
Chain INPUT (policy ACCEPT)
target     prot opt source               destination
DROP       tcp  --  anywhere             anywhere             tcp dpt:http
```
<span class='prompt'>root@ip-172-31-21-14:/#</span><code class='command'> iptables --list INPUT --line-numbers</code>
```
Chain INPUT (policy ACCEPT)
num  target     prot opt source               destination
1    DROP       tcp  --  anywhere             anywhere             tcp dpt:http
```
<span class='prompt'>root@ip-172-31-21-14:/#</span><code class='command'> iptables -D INPUT 1</code>
```
```
<span class='prompt'>root@ip-172-31-21-14:/#</span><code class='command'> curl http://127.0.0.1</code>

```text
<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">
<html><head>
<title>403 Forbidden</title>
</head><body>
<h1>Forbidden</h1>
<p>You don't have permission to access this resource.</p>
<hr>
<address>Apache/2.4.52 (Ubuntu) Server at 127.0.0.1 Port 80</address>
</body></html>
13:56:40.569041 IP localhost.http > localhost.55440: Flags [S.], seq 4102736566, ack 287174662, win 65483, options [mss 65495,sackOK,TS val 3439744375 ecr 3439744375,nop,wscale 6], length 0
13:56:40.569052 IP localhost.55440 > localhost.http: Flags [.], ack 1, win 1024, options [nop,nop,TS val 3439744375 ecr 3439744375], length 0
13:56:40.569076 IP localhost.55440 > localhost.http: Flags [P.], seq 1:74, ack 1, win 1024, options [nop,nop,TS val 3439744375 ecr 3439744375], length 73: HTTP: GET / HTTP/1.1
13:56:40.569087 IP localhost.http > localhost.55440: Flags [.], ack 74, win 1023, options [nop,nop,TS val 3439744375 ecr 3439744375], length 0
13:56:40.569983 IP localhost.http > localhost.55440: Flags [P.], seq 1:436, ack 74, win 1024, options [nop,nop,TS val 3439744375 ecr 3439744375], length 435: HTTP: HTTP/1.1 403 Forbidden
13:56:40.570012 IP localhost.55440 > localhost.http: Flags [.], ack 436, win 1018, options [nop,nop,TS val 3439744375 ecr 3439744375], length 0
13:56:40.570162 IP localhost.55440 > localhost.http: Flags [F.], seq 74, ack 436, win 1024, options [nop,nop,TS val 3439744376 ecr 3439744375], length 0
13:56:40.570261 IP localhost.http > localhost.55440: Flags [F.], seq 436, ack 75, win 1024, options [nop,nop,TS val 3439744376 ecr 3439744376], length 0
13:56:40.570268 IP localhost.55440 > localhost.http: Flags [.], ack 437, win 1024, options [nop,nop,TS val 3439744376 ecr 3439744376], length 0
```
<span class='prompt'>root@ip-172-31-21-14:/#</span><code class='command'> fg</code>
```
tcpdump -i lo host 127.0.0.1 and port 80
^C
13 packets captured
26 packets received by filter
0 packets dropped by kernel
```
<span class='prompt'>root@ip-172-31-21-14:/#</span><code class='command'> cd /var/</code>
```
backups/ cache/   crash/   lib/     local/   lock/    log/     mail/    opt/     run/     snap/    spool/   tmp/     www/
```
<span class='prompt'>root@ip-172-31-21-14:/#</span><code class='command'> cd /var/</code>
```
backups/ cache/   crash/   lib/     local/   lock/    log/     mail/    opt/     run/     snap/    spool/   tmp/     www/
```
<span class='prompt'>root@ip-172-31-21-14:/#</span><code class='command'> cd /var/www/</code>
```
```
<span class='prompt'>root@ip-172-31-21-14:/var/www#</span><code class='command'> ls</code>
```
html
```
<span class='prompt'>root@ip-172-31-21-14:/var/www#</span><code class='command'> ps -ef|grep pache</code>
```
root         625       1  0 13:52 ?        00:00:00 /usr/sbin/apache2 -k start
www-data     776     625  0 13:52 ?        00:00:00 /usr/sbin/apache2 -k start
www-data     777     625  0 13:52 ?        00:00:00 /usr/sbin/apache2 -k start
root        1208     882  0 13:57 pts/0    00:00:00 grep --color=auto pache
```
<span class='prompt'>root@ip-172-31-21-14:/var/www#</span><code class='command'> chown -R www-data .</code>
```
```
<span class='prompt'>root@ip-172-31-21-14:/var/www#</span><code class='command'> curl http://127.0.0.1</code>
```
hello sadserver
```

###	6. "Cape Town": Borked Nginx

<span class='prompt'>admin@ip-172-31-36-236:/$</span><code class='command'> sudo systemctl status nginx.service</code>
```
● nginx.service - The NGINX HTTP and reverse proxy server
     Loaded: loaded (/etc/systemd/system/nginx.service; enabled; vendor preset: enabled)
     Active: failed (Result: exit-code) since Sun 2023-04-23 07:35:49 UTC; 1min 6s ago
    Process: 575 ExecStartPre=/usr/sbin/nginx -t (code=exited, status=1/FAILURE)
        CPU: 27ms

Apr 23 07:35:49 ip-172-31-36-236 systemd[1]: Starting The NGINX HTTP and reverse proxy server...
Apr 23 07:35:49 ip-172-31-36-236 nginx[575]: nginx: [emerg] unexpected ";" in /etc/nginx/sites-enabled/default:1
Apr 23 07:35:49 ip-172-31-36-236 nginx[575]: nginx: configuration file /etc/nginx/nginx.conf test failed
Apr 23 07:35:49 ip-172-31-36-236 systemd[1]: nginx.service: Control process exited, code=exited, status=1/FAILURE
Apr 23 07:35:49 ip-172-31-36-236 systemd[1]: nginx.service: Failed with result 'exit-code'.
Apr 23 07:35:49 ip-172-31-36-236 systemd[1]: Failed to start The NGINX HTTP and reverse proxy server.
```
<span class='prompt'>admin@ip-172-31-36-236:/$</span><code class='command'> sudo nano /etc/nginx/sites-enabled/default </code>
<span class='prompt'>admin@ip-172-31-36-236:/$</span><code class='command'> sudo systemctl restart nginx.service</code>
<span class='prompt'>admin@ip-172-31-36-236:/$</span><code class='command'> sudo systemctl status nginx.service</code>
```
● nginx.service - The NGINX HTTP and reverse proxy server
     Loaded: loaded (/etc/systemd/system/nginx.service; enabled; vendor preset: enabled)
     Active: active (running) since Sun 2023-04-23 07:37:42 UTC; 6s ago
    Process: 927 ExecStartPre=/usr/sbin/nginx -t (code=exited, status=0/SUCCESS)
    Process: 928 ExecStart=/usr/sbin/nginx (code=exited, status=0/SUCCESS)
   Main PID: 929 (nginx)
      Tasks: 2 (limit: 524)
     Memory: 3.3M
        CPU: 30ms
     CGroup: /system.slice/nginx.service
             ├─929 nginx: master process /usr/sbin/nginx
             └─930 nginx: worker process

Apr 23 07:37:42 ip-172-31-36-236 systemd[1]: Starting The NGINX HTTP and reverse proxy server...
Apr 23 07:37:42 ip-172-31-36-236 nginx[927]: nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
Apr 23 07:37:42 ip-172-31-36-236 nginx[927]: nginx: configuration file /etc/nginx/nginx.conf test is successful
Apr 23 07:37:42 ip-172-31-36-236 systemd[1]: Started The NGINX HTTP and reverse proxy server.
```
<span class='prompt'>admin@ip-172-31-36-236:/$</span><code class='command'> curl -Is 127.0.0.1:80</code>
```
HTTP/1.1 500 Internal Server Error
Server: nginx/1.18.0
Date: Sun, 23 Apr 2023 07:38:13 GMT
Content-Type: text/html
Content-Length: 177
Connection: close

```
<span class='prompt'>admin@ip-172-31-36-236:/$ </span><code class='command'>tail /var/log/nginx/error.log </code>
```
2022/09/11 16:39:11 [emerg] 5875#5875: unexpected ";" in /etc/nginx/sites-enabled/default:1
2022/09/11 16:54:26 [emerg] 5931#5931: unexpected ";" in /etc/nginx/sites-enabled/default:1
2022/09/11 16:55:00 [emerg] 5961#5961: unexpected ";" in /etc/nginx/sites-enabled/default:1
2022/09/11 17:02:07 [emerg] 6066#6066: unexpected ";" in /etc/nginx/sites-enabled/default:1
2022/09/11 17:07:03 [emerg] 6146#6146: unexpected ";" in /etc/nginx/sites-enabled/default:1
2023/04/23 07:35:49 [emerg] 575#575: unexpected ";" in /etc/nginx/sites-enabled/default:1
2023/04/23 07:37:42 [alert] 929#929: socketpair() failed while spawning "worker process" (24: Too many open files)
2023/04/23 07:37:42 [emerg] 930#930: eventfd() failed (24: Too many open files)
2023/04/23 07:37:42 [alert] 930#930: socketpair() failed (24: Too many open files)
2023/04/23 07:38:13 [crit] 930#930: *1 open() "/var/www/html/index.nginx-debian.html" failed (24: Too many open files), client: 127.0.0.1, server: _, request: "HEAD / HTTP/1.1", host: "127.0.0.1"
```
<span class='prompt'>admin@ip-172-31-36-236:/$</span><code class='command'> sudo systemctl show nginx.service | grep -i limitnofile</code>
```
LimitNOFILE=10
LimitNOFILESoft=10
```
<span class='prompt'>admin@ip-172-31-36-236:/$</span><code class='command'> sudo systemctl edit nginx.service</code>
<span class='prompt'>admin@ip-172-31-36-236:/$</span><code class='command'> sudo systemctl restart nginx.service</code>
<span class='prompt'>admin@ip-172-31-36-236:/$</span><code class='command'> curl -Is 127.0.0.1:80</code>
```
HTTP/1.1 200 OK
Server: nginx/1.18.0
Date: Sun, 23 Apr 2023 07:41:13 GMT
Content-Type: text/html
Content-Length: 612
Last-Modified: Sun, 11 Sep 2022 15:58:42 GMT
Connection: keep-alive
ETag: "631e05b2-264"
Accept-Ranges: bytes
```

### 7. "Salta": Docker container won't start.

<span class='prompt'>admin@ip-172-31-32-68:/$</span><code class='command'> sudo docker ps</code>
```
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
```
<span class='prompt'>admin@ip-172-31-32-68:/$</span><code class='command'> cd /home/admin/app</code>
```
```
<span class='prompt'>admin@ip-172-31-32-68:~/app$</span><code class='command'> ls</code>
```
Dockerfile  package-lock.json  package.json  server.js
```
<span class='prompt'>admin@ip-172-31-32-68:~/app$</span><code class='command'> cat Dockerfile </code>
```
# documentation https://nodejs.org/en/docs/guides/nodejs-docker-webapp/

# most recent node (security patches) and alpine (minimal, adds to security, possible libc issues)
FROM node:15.7-alpine 

# Create app directory & copy app files
WORKDIR /usr/src/app

# we copy first package.json only, so we take advantage of cached Docker layers
COPY ./package*.json ./

# RUN npm ci --only=production
RUN npm install

# Copy app source
COPY ./* ./

# port used by this app
EXPOSE 8880

# command to run
CMD [ "node", "serve.js" ]
```
<span class='prompt'>admin@ip-172-31-32-68:~/app$</span><code class='command'> sudo docker image ls</code>
```
REPOSITORY   TAG           IMAGE ID       CREATED        SIZE
app          latest        1d782b86d6f2   7 months ago   124MB
node         15.7-alpine   706d12284dd5   2 years ago    110MB
```
<span class='prompt'>admin@ip-172-31-32-68:~/app$</span><code class='command'> sudo docker run -p 8888:8888 app</code>
```
docker: Error response from daemon: driver failed programming external connectivity on endpoint modest_blackwell (d19bb4d6508a5d6e8d7223a575dedacb788f1b81af190bd80eca389e084b968e): Error starting userland proxy: listen tcp4 0.0.0.0:8888: bind: address already in use.
ERRO[0000] error waiting for container: context canceled 
```
<span class='prompt'>admin@ip-172-31-32-68:~/app$</span><code class='command'> sudo ss -ltp</code>
```
State          Recv-Q         Send-Q                   Local Address:Port                       Peer Address:Port         Process                                                                                  
LISTEN         0              128                            0.0.0.0:ssh                             0.0.0.0:*             users:(("sshd",pid=594,fd=3))                                                           
LISTEN         0              511                            0.0.0.0:8888                            0.0.0.0:*             users:(("nginx",pid=1059,fd=6),("nginx",pid=1058,fd=6),("nginx",pid=1057,fd=6))         
LISTEN         0              128                               [::]:ssh                                [::]:*             users:(("sshd",pid=594,fd=4))                                                           
LISTEN         0              511                               [::]:8888                               [::]:*             users:(("nginx",pid=1059,fd=7),("nginx",pid=1058,fd=7),("nginx",pid=1057,fd=7))         
LISTEN         0              4096                                 *:6767                                  *:*             users:(("sadagent",pid=566,fd=7))                                                       
LISTEN         0              4096                                 *:http-alt                              *:*             users:(("gotty",pid=565,fd=6))                                                          
```
<span class='prompt'>admin@ip-172-31-32-68:~/app$</span><code class='command'> sudo systemctl stop nginx.service</code>
```
```
<span class='prompt'>admin@ip-172-31-32-68:~/app$</span><code class='command'> sudo ss -ltp</code>
```
State                Recv-Q               Send-Q                             Local Address:Port                                   Peer Address:Port               Process                                          
LISTEN               0                    128                                      0.0.0.0:ssh                                         0.0.0.0:*                   users:(("sshd",pid=594,fd=3))                   
LISTEN               0                    128                                         [::]:ssh                                            [::]:*                   users:(("sshd",pid=594,fd=4))                   
LISTEN               0                    4096                                           *:6767                                              *:*                   users:(("sadagent",pid=566,fd=7))               
LISTEN               0                    4096                                           *:http-alt                                          *:*                   users:(("gotty",pid=565,fd=6))                  
```
<span class='prompt'>admin@ip-172-31-32-68:~/app$</span><code class='command'> sudo docker run -p 8888:8888 app</code>
```
node:internal/modules/cjs/loader:928
  throw err;
  ^

Error: Cannot find module '/usr/src/app/serve.js'
    at Function.Module._resolveFilename (node:internal/modules/cjs/loader:925:15)
    at Function.Module._load (node:internal/modules/cjs/loader:769:27)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:76:12)
    at node:internal/main/run_main_module:17:47 {
  code: 'MODULE_NOT_FOUND',
  requireStack: []
}
```
<span class='prompt'>admin@ip-172-31-32-68:~/app$</span><code class='command'> nano Dockerfile </code>
```
```
<span class='prompt'>admin@ip-172-31-32-68:~/app$</span><code class='command'> tail Dockerfile </code>
```
RUN npm install

# Copy app source
COPY ./* ./

# port used by this app
EXPOSE 8888

# command to run
CMD [ "node", "server.js" ]
```
<span class='prompt'>admin@ip-172-31-32-68:~/app$</span><code class='command'> sudo docker build -t app .</code>
```
Sending build context to Docker daemon  101.9kB
Step 1/7 : FROM node:15.7-alpine
 ---> 706d12284dd5
Step 2/7 : WORKDIR /usr/src/app
 ---> Using cache
 ---> 463b1571f18e
Step 3/7 : COPY ./package*.json ./
 ---> Using cache
 ---> acfb467c80ba
Step 4/7 : RUN npm install
 ---> Using cache
 ---> 5cad5aa08c7a
Step 5/7 : COPY ./* ./
 ---> e2ae6a8b99cb
Step 6/7 : EXPOSE 8888
 ---> Running in f50d629b40b1
Removing intermediate container f50d629b40b1
 ---> 3a3eef19bf7e
Step 7/7 : CMD [ "node", "server.js" ]
 ---> Running in 69d44979aa49
Removing intermediate container 69d44979aa49
 ---> de083248430d
Successfully built de083248430d
Successfully tagged app:latest
```
<span class='prompt'>admin@ip-172-31-32-68:~/app$</span><code class='command'> sudo docker run -d -p 8888:8888 app</code>
```
6990ba2f6f7ea5296d63e1be73a06cd649bdaceec1a9a6c7f8d31f0d41f8726b
```
<span class='prompt'>admin@ip-172-31-32-68:~/app$</span><code class='command'> sudo docker ps</code>
```
CONTAINER ID   IMAGE     COMMAND                  CREATED         STATUS         PORTS                                       NAMES
6990ba2f6f7e   app       "docker-entrypoint.s…"   5 seconds ago   Up 4 seconds   0.0.0.0:8888->8888/tcp, :::8888->8888/tcp   serene_bohr
```
<span class='prompt'>admin@ip-172-31-32-68:~/app$</span><code class='command'> sudo docker logs serene_bohr</code>
```
Server Started on: 8888
```

### 9. "Oaxaca": Close an Open File
<span class='prompt'>admin@ip-172-31-45-143:/$</span><code class='command'> cd /home/admin</code>
<span class='prompt'>admin@ip-172-31-45-143:~$</span><code class='command'> lsof somefile</code>
```
COMMAND PID  USER   FD   TYPE DEVICE SIZE/OFF   NODE NAME
bash    803 admin   77w   REG  259,1        0 272875 somefile
```
<span class='prompt'>admin@ip-172-31-45-143:~$</span><code class='command'> ps -w -p 803</code>
```
    PID TTY          TIME CMD
    803 pts/0    00:00:00 bash
```
<span class='prompt'>admin@ip-172-31-45-143:~$</span><code class='command'> echo $$</code>
```
803
```
<span class='prompt'>admin@ip-172-31-45-143:~$</span><code class='command'> exec 77<&-</code>

<span class='prompt'>admin@ip-172-31-45-143:~$</span><code class='command'> lsof somefile</code>

<link rel="stylesheet" href="/public/css/sad-servers.css"/>
