import requests

response = requests.get('http://localhost:3000/lyrics')

# Check the response status code
if (response.status_code == 200):
  print('The server responded succesfully!')

# Make a request to the movies endpoint of the API
response = requests.get('http://localhost:3000/movies')

if (response.status_code == 200):
  print('The server responded succesfully!')
  
# Check the response status code
elif (response.status_code == 404):
  print('Oops, that API could not be found!')


response = requests.get('http://localhost:3000/movies')

# Check if the response.status_code is equal to the requests.codes value for "200 OK"
if(response.status_code == requests.codes.ok):
  print('The server responded succesfully!')
  
# Or if the request was not successful because the API did not exist
elif (response.status_code == requests.codes.not_found):
  print('Oops, that API could not be found!')

# Add a header to use in the request
headers = {'accept': 'application/xml'}
response = requests.get('http://localhost:3000/lyrics', headers=headers)

# Check if the server did not accept the request
if (response.status_code == 406):
  print('The server can not respond in XML')
  
  # Print the accepted content types
  print('These are the content types the server accepts: ' + response.headers['accept'])
else:
  print(response.text)