#!/bin/bash

# Find specific syntax error in line 291
sed -i '291s/}));/});/' server/routes.ts

# Fix all extra closing parentheses in response status with error messages
sed -i 's/message: "Internal server error" }));/message: "Internal server error" });/g' server/routes.ts

# Fix handler closings to add the extra closing parenthesis for withAuth where needed
grep -n -A1 'app\.\(get\|post\|put\|patch\|delete\).*withAuth(async (req, res)' server/routes.ts | grep -v 'withAuth' | grep -B1 '});$' > closings.txt

while read -r line1 && read -r line2; do
  closing_line=$(echo "$line2" | cut -d'-' -f1)
  
  # Replace the closing pattern to add the extra parenthesis for withAuth if needed
  sed -i "${closing_line}s/});/}));/" server/routes.ts
  echo "Fixed closing bracket at line $closing_line"
done < closings.txt

rm closings.txt