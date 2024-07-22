#!/bin/bash

MODULE_NAME=$1

if [ -z "$MODULE_NAME" ]; then
  echo "Module name is required"
  exit 1
fi

# Generate the module
npx nest g module modules/$MODULE_NAME

# Generate the controller and service
npx nest g controller modules/$MODULE_NAME/controller/$MODULE_NAME --flat
npx nest g service modules/$MODULE_NAME/services/$MODULE_NAME --flat

# Create directories
mkdir -p src/modules/$MODULE_NAME/controllers
mkdir -p src/modules/$MODULE_NAME/services

# Move files to the correct directories
mv src/modules/$MODULE_NAME/$MODULE_NAME.controller.ts src/modules/$MODULE_NAME/controllers/
mv src/modules/$MODULE_NAME/$MODULE_NAME.service.ts src/modules/$MODULE_NAME/services/


# TO USE THIS SCRIPT SIMPLY RUN
# chmod +x module.generator.sh
# ./module.generator.sh {MODULE_NAME e.g user}