# Unit-testing a data pipeline
raw_tax_data = extract("raw_tax_data.csv")
clean_tax_data = transform(raw_tax_data)

# Validate the number of columns in the DataFrame
assert len(clean_tax_data.columns) == 5

#
raw_tax_data = extract("raw_tax_data.csv")
clean_tax_data = transform(raw_tax_data)

# Determine if the clean_tax_data DataFrames take type pd.DataFrame
isinstance(clean_tax_data, pd.DataFrame)

#
raw_tax_data = extract("raw_tax_data.csv")
clean_tax_data = transform(raw_tax_data)

# Assert that clean_tax_data is an instance of a pd.DataFrame
assert isinstance(clean_tax_data, pd.DataFrame)

#
raw_tax_data = extract("raw_tax_data.csv")
clean_tax_data = transform(raw_tax_data)

# Assert that clean_tax_data takes is an instance of a string
try:
	assert isinstance(clean_tax_data, str)
except Exception as e:
	print(e)

#
import pytest

def test_transformed_data():
    raw_tax_data = extract("raw_tax_data.csv")
    clean_tax_data = transform(raw_tax_data)
    
    # Assert that the transform function returns a pd.DataFrame
    assert isinstance(clean_tax_data, pd.DataFrame)
    
    # Assert that the clean_tax_data DataFrame has more columns than the raw_tax_data DataFrame
    assert len(clean_tax_data.columns) > len(raw_tax_data.columns)

#
# Import pytest
import pytest

# Create a pytest fixture
@pytest.fixture()
def raw_tax_data():
	raw_data = extract("raw_tax_data.csv")
    
    # Return the raw DataFrame
	return raw_data

#
# Define a pytest fixture
@pytest.fixture()
def clean_tax_data():
    raw_data = pd.read_csv("raw_tax_data.csv")
    
    # Transform the raw_data, store in clean_data DataFrame, and return the variable
    clean_data = transform(raw_data)
    return clean_data

#
@pytest.fixture()
def clean_tax_data():
    raw_data = pd.read_csv("raw_tax_data.csv")
    clean_data = transform(raw_data)
    return clean_data

# Pass the fixture to the function
def test_tax_rate(clean_tax_data):
    # Assert values are within the expected range
    assert clean_tax_data["tax_rate"].max() <= 1 and clean_tax_data["tax_rate"].min() >= 0