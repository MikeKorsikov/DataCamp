# API Authentication

### Fail 

response = requests.get('http://localhost:3000/albums')

# Check if the status code on the response object matches a successful response
if(response.status_code == 200):
    print("Success!")
# Check if the status code indicates a failed authentication attempt
elif(response.status_code == 401):
    print('Authentication failed')
else:
    print('Another error occurred')

### Pass

# Create the authentication tuple with the correct values for basic authentication
authentication = ('john@doe.com', 'Warp_ExtrapolationsForfeited2')

# Use the correct function argument to pass the authentication tuple to the API
response = requests.get('http://localhost:3000/albums', auth=authentication)

if(response.status_code == 200):
    print("Success!")
elif(response.status_code == 401):
    print('Authentication failed')
else:
    print('Another error occurred')

### Fail

# Create a dictionary containing the API key using the correct key-value combination
params = {'access_token': '8apDFHaNJMxy8Kt818aa6b4a0ed0514b5d3'}
# Add the dictionary to the requests.get() call using the correct function argument
response = requests.get('http://localhost:3000/albums', params=params)

if(response.status_code == 200):
    print("Success!")
elif(response.status_code == 401):
    print('Authentication failed')
else:
    print('Another error occurred')

### Pass

# Create a headers dictionary containing and set the API key using the correct key and value 
headers = {'Authorization': 'Bearer 8apDFHaNJMxy8Kt818aa6b4a0ed0514b5d3'}
# Add the headers dictionary to the requests.get() call using the correct function argument
response = requests.get('http://localhost:3000/albums', headers=headers)

if(response.status_code == 200):
    print("Success!")
elif(response.status_code == 401):
    print('Authentication failed')
else:
    print('Another error occurred')
