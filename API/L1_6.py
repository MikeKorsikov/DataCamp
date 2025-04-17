# Data structures
# JSON

# Encoding (dump) - Python object to JSON string
# Decoding (load) - JSON string to Python object

# request JSON from the API

headers = {
    'Authorization': 'Bearer ' + API_TOKEN,
    # Add a header to request JSON formatted data
    'Accept': 'application/json'
}
response = requests.get('http://localhost:3000/albums/1/', headers=headers)

# Get the JSON data as a Python object from the response object
album = response.json()

# Print the album title
print(album['Title'])


# Sending JSON with the requests package

playlists = [{"Name":"Rock ballads"}, {"Name":"My favorite songs"}, {"Name":"Road Trip"}]

# POST the playlists array to the API using the json argument
requests.post('http://localhost:3000/playlists/', json=playlists)

# Get the list of all created playlists
response = requests.get('http://localhost:3000/playlists')

# Print the response text to inspect the JSON text
print(response.text)
