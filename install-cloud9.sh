#!/bin/bash
npm install
sudo service postgresql start
sudo apt-get update
sudo apt-get install postgresql-contrib-9.3 uuid
echo "REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM elasng" | sudo sudo -u postgres psql
echo "REVOKE ALL PRIVILEGES ON DATABASE postgres FROM elasng" | sudo sudo -u postgres psql
echo "DROP USER elasng" | sudo sudo -u postgres psql
echo "CREATE USER elasng WITH PASSWORD 'elasng'" | sudo sudo -u postgres psql

# construct tables.
./create-database.sh

echo "GRANT ALL PRIVILEGES ON DATABASE postgres TO elasng" | sudo sudo -u postgres psql
echo "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO elasng" | sudo sudo -u postgres psql
