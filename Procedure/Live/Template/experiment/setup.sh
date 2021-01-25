mkdir -p data

if id "www-data" &>/dev/null; then
    setfacl -m u:www-data:rwx data/
fi
if id "apache" &>/dev/null; then
    setfacl -m u:apache:rwx data/
fi
