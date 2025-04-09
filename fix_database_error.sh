#!/bin/bash

# Find all places where handleApiDatabaseError is called with the wrong parameter order
grep -n "return handleApiDatabaseError(error, res)" server/routes.ts > db_errors.txt

while IFS= read -r line; do
  line_number=$(echo "$line" | cut -d':' -f1)
  
  # Replace the parameter order
  sed -i "${line_number}s/handleApiDatabaseError(error, res)/handleApiDatabaseError(res, error)/" server/routes.ts
  echo "Fixed line $line_number"
done < db_errors.txt

rm db_errors.txt