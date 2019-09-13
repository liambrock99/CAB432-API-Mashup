FROM node:10.16.3

# Copy app source
COPY ./cab432 /src 

# Set work directory to /src
WORKDIR /src

# Install dependencies
RUN npm install

# Expose the port the server is running on
EXPOSE 3000

# Start command from package.json
CMD ["npm", "start"]