#!/bin/bash

# Fix ApiErrorCode and sendErrorResponse parameter order
sed -i 's/sendErrorResponse(\s*res,\s*400,\s*ApiErrorCode.BAD_REQUEST,/sendErrorResponse(res, "400", ApiErrorCode.VALIDATION_ERROR,/g' server/routes.ts
sed -i 's/sendErrorResponse(\s*res,\s*404,\s*ApiErrorCode.NOT_FOUND,/sendErrorResponse(res, "404", ApiErrorCode.NOT_FOUND,/g' server/routes.ts
sed -i 's/sendErrorResponse(\s*res,\s*409,\s*ApiErrorCode.CONFLICT,/sendErrorResponse(res, "409", ApiErrorCode.CONFLICT,/g' server/routes.ts

# Add withAuth wrapper to challenge endpoints
sed -i '296s/app.get("\/api\/challenges", authenticateUser, async (req, res) =>/app.get("\/api\/challenges", authenticateUser, withAuth(async (req, res) =>/' server/routes.ts
sed -i '306s/app.get("\/api\/challenges\/user", authenticateUser, async (req, res) =>/app.get("\/api\/challenges\/user", authenticateUser, withAuth(async (req, res) =>/' server/routes.ts
sed -i '316s/app.post("\/api\/challenges\/:challengeId\/accept", authenticateUser, async (req, res) =>/app.post("\/api\/challenges\/:challengeId\/accept", authenticateUser, withAuth(async (req, res) =>/' server/routes.ts
sed -i '327s/app.put("\/api\/challenges\/:challengeId\/progress", authenticateUser, async (req, res) =>/app.put("\/api\/challenges\/:challengeId\/progress", authenticateUser, withAuth(async (req, res) =>/' server/routes.ts

# Fix parentheses in challenge endpoints
sed -i '304s/});/}));/' server/routes.ts
sed -i '314s/});/}));/' server/routes.ts
sed -i '325s/});/}));/' server/routes.ts
sed -i '337s/});/}));/' server/routes.ts

# Fix parentheses in other JSON response messages
sed -i 's/}););/});/g' server/routes.ts
sed -i 's/message: "Internal server error" }));/message: "Internal server error" });/g' server/routes.ts

# Fix extra parenthesis in internal server error messages
sed -i 's/res.status(500).json({ message: "Internal server error" }));/res.status(500).json({ message: "Internal server error" });/g' server/routes.ts