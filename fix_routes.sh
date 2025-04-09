#!/bin/bash

# Fix lines with withAuth wrapper missing
while IFS= read -r line; do
  line_number=$(echo "$line" | cut -d':' -f1)
  content=$(echo "$line" | cut -d':' -f2-)
  
  # Extract the base pattern
  route_pattern=$(echo "$content" | grep -oE 'app\.(get|post|put|patch|delete)\(".*", authenticateUser, async \(req, res\) =>')
  
  if [ ! -z "$route_pattern" ]; then
    # Create the replacement pattern with withAuth wrapper
    orig_pattern="$route_pattern"
    new_pattern=$(echo "$route_pattern" | sed 's/async (req, res) =>/withAuth(async (req, res) =>/')
    
    # Replace in the file
    sed -i "${line_number}s/$orig_pattern/$new_pattern/" server/routes.ts
    echo "Fixed line $line_number: $orig_pattern -> $new_pattern"
  fi
done < <(grep -n 'app\.\(get\|post\|put\|patch\|delete\).*authenticateUser, async (req, res) =>' server/routes.ts)

# Fix missing closing brackets (add closing parenthesis to withAuth)
while IFS= read -r line; do
  line_number=$(echo "$line" | cut -d':' -f1)
  content=$(echo "$line" | cut -d':' -f2-)
  
  if [[ "$content" == *"});"* && "$content" != *"}))"* ]]; then
    # Replace the closing pattern to add the extra parenthesis for withAuth
    sed -i "${line_number}s/});/}));/" server/routes.ts
    echo "Fixed closing bracket at line $line_number"
  fi
done < <(grep -n '});' server/routes.ts)

# Fix syntax errors with extra parenthesis
while IFS= read -r line; do
  line_number=$(echo "$line" | cut -d':' -f1)
  content=$(echo "$line" | cut -d':' -f2-)
  
  if [[ "$content" == *"))"* ]]; then
    # Replace the extra closing parenthesis
    sed -i "${line_number}s/));/);/" server/routes.ts
    echo "Fixed extra parenthesis at line $line_number"
  fi
done < <(grep -n 'res\.status.*));' server/routes.ts)