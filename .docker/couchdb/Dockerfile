FROM couchdb:latest
VOLUME ["/opt/couchdb/data"]
COPY ".docker/couchdb/local.ini" "/opt/couchdb/etc/"
WORKDIR /opt/couchdb


EXPOSE 5984

#ARG COUCHDB_PASSWORD
#ENV COUCHDB_PASSWORD=${DB_PASSWORD}
#ARG COUCHDB_USER
#ENV COUCHDB_USER=${DB_USER}
ENV COUCHDB_CREATE_DATABASES=user