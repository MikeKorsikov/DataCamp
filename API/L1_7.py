# Error handling

# Import the correct exception class
from requests.exceptions import HTTPError

url ="http://localhost:3000/albums/"
try: 
    r = requests.get(url) 
	# Enable raising errors for all error status_codes
    r.raise_for_status()
    print(r.status_code)
# Intercept the error 
except HTTPError as http_err:
    print(f'HTTP error occurred: {http_err}')

###

while True:
    params = {'page': page_number, 'per_page': 500}
    response = requests.get('http://localhost:3000/tracks', params=params, headers=headers)
    response.raise_for_status()
    response_data = response.json()
    
    print(f'Fetching tracks page {page_number}')

    if len(response_data['results']) == 0:
        break

    for track in response_data['results']:
        if(track['Length'] > longestTrackLength):
            longestTrackLength = track['Length']
            longestTrackTitle = track['Name']

    page_number = page_number + 1
    
    # Add your fix here
    time.sleep(3)

print('The longest track in my music library is: ' + longestTrackTitle)
