#!/bin/bash

# Fix double parentheses due to the other scripts
sed -i 's/}));/});/g' server/routes.ts

# Fix any missing withAuth wrappers
grep -n 'authenticateUser, async (req,' server/routes.ts > routes_to_fix.txt

while IFS= read -r line; do
  line_number=$(echo "$line" | cut -d':' -f1)
  
  # Replace the pattern to add withAuth wrapper
  sed -i "${line_number}s/authenticateUser, async (req/authenticateUser, withAuth(async (req/" server/routes.ts
  
  # Find the corresponding closing line and add closing parenthesis
  closing_line=$(awk -v start="$line_number" '{if(NR>start && $0 ~ /^  });$/) {print NR; exit}}' server/routes.ts)
  
  if [ ! -z "$closing_line" ]; then
    sed -i "${closing_line}s/});/}));/" server/routes.ts
    echo "Fixed lines $line_number to $closing_line"
  fi
done < routes_to_fix.txt

# Fix numbers in sendErrorResponse calls
sed -i 's/sendErrorResponse(res, \([0-9]\+\),/sendErrorResponse(res, "\1",/g' server/routes.ts

# Fix BAD_REQUEST to VALIDATION_ERROR
sed -i 's/ApiErrorCode\.BAD_REQUEST/ApiErrorCode.VALIDATION_ERROR/g' server/routes.ts

rm routes_to_fix.txt