#!/bin/bash
docker rm -f osja >/dev/null 2>&1
docker run -d --name osja -p 9200:9200 \
  -e discovery.type=single-node -e DISABLE_SECURITY_PLUGIN=true -e DISABLE_INSTALL_DEMO_CONFIG=true \
  -e "OPENSEARCH_JAVA_OPTS=-Xms2g -Xmx2g" os-ja:2.19.1 >/dev/null
for i in $(seq 1 60); do curl -s localhost:9200 >/dev/null && break; sleep 3; done
curl -s localhost:9200 | grep -E '"number"|tagline'
curl -s "localhost:9200/_cat/plugins?h=component" | sort -u | grep -E 'kuromoji|icu|neural|knn'
