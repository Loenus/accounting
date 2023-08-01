FROM couchdb:latest
VOLUME ["/opt/couchdb/data"]
COPY ".docker/couchdb/local.ini" "/opt/couchdb/etc/"
WORKDIR /opt/couchdb

EXPOSE 5984
