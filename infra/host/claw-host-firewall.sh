#!/bin/sh
# Host INPUT firewall for the public interface (eth0). Docker-published ports go through FORWARD and
# are guarded by DOCKER-USER (claw-docker-firewall.sh); this chain guards services on the host itself.
# Open: SSH 22, HTTP/HTTPS 80/443, the hosting provider's agent 2224 (already closed upstream),
# replies to our own traffic, ICMP, DHCP. Everything else arriving on eth0 is dropped. Idempotent.
set -eu
IFACE=eth0

for tool in iptables ip6tables; do
  $tool -N CLAW-INPUT 2>/dev/null || true
  $tool -F CLAW-INPUT
  $tool -A CLAW-INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
  $tool -A CLAW-INPUT -m conntrack --ctstate INVALID -j DROP
  $tool -A CLAW-INPUT -p tcp -m multiport --dports 22,80,443,2224 -j RETURN
done
iptables -A CLAW-INPUT -p icmp -j RETURN
iptables -A CLAW-INPUT -p udp --sport 67 --dport 68 -j RETURN
ip6tables -A CLAW-INPUT -p ipv6-icmp -j RETURN
ip6tables -A CLAW-INPUT -p udp --sport 547 --dport 546 -j RETURN
for tool in iptables ip6tables; do
  $tool -A CLAW-INPUT -j DROP
  $tool -C INPUT -i "$IFACE" -j CLAW-INPUT 2>/dev/null || $tool -I INPUT 1 -i "$IFACE" -j CLAW-INPUT
done
