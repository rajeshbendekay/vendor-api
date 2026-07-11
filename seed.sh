#!/bin/bash
# Seeds sample data and exercises the full quotation workflow against the running API.
set -e
B=http://localhost:3001/api
post() { curl -s "$B$1" -H "Content-Type: application/json" -d "$2"; }

echo "== Reset =="
# Wipe in FK-safe order via API is awkward; rely on a fresh DB instead if needed.

echo "== Vendors =="
post /vendors '{"name":"Suresh Babu","companyName":"FlexPrint Hub","gstNumber":"29XYZAB5678C1Z2","address":"45 SP Road, Bengaluru","phone":"9886022222","email":"suresh@flexprint.in","specialties":["PRINTING","FABRICATION"]}' >/dev/null
post /vendors '{"name":"Mahesh Rao","companyName":"SkyHigh Installers","gstNumber":"29LMNOP9012D1Z8","address":"7 Outer Ring Rd, Bengaluru","phone":"9886033333","email":"mahesh@skyhigh.in","specialties":["INSTALLATION","TRANSPORT"]}' >/dev/null
post /vendors '{"name":"All-in-One Signs","companyName":"OneStop Signage Co","gstNumber":"29QRSTU3456E1Z1","address":"99 Industrial Area, Bengaluru","phone":"9886044444","email":"info@onestopsignage.in","specialties":["DESIGN","PRINTING","FABRICATION","INSTALLATION"]}' >/dev/null

echo "== Clients =="
post /clients '{"name":"Anil Mehta","companyName":"Mehta Electronics","gstNumber":"29CLNT11111A1Z9","address":"Brigade Road, Bengaluru","phone":"9000011111","email":"anil@mehtaelec.in"}' >/dev/null
post /clients '{"name":"Priya Nair","companyName":"GreenLeaf Cafe","gstNumber":"29CLNT22222B1Z7","address":"Indiranagar, Bengaluru","phone":"9000022222","email":"priya@greenleaf.in"}' >/dev/null

echo "Vendors & clients seeded."
