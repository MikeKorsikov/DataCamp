# Running a data pipeline in production
# Import the extract, transform, and load functions from pipeline_utils
from pipeline_utils import extract, transform, load

# Run the pipeline end to end by extracting, transforming and loading the data
raw_tax_data = extract("raw_tax_data.csv")
clean_tax_data = transform(raw_tax_data)
load(clean_tax_data, "clean_tax_data.parquet")


#
import logging
from pipeline_utils import extract, transform, load

logging.basicConfig(format='%(levelname)s: %(message)s', level=logging.DEBUG)

try:
  	# Extract, transform, and load the tax data
	raw_tax_data = extract("raw_tax_data.csv")
	clean_tax_data = transform(raw_tax_data)
	load(clean_tax_data, "clean_tax_data.parquet")
    
except Exception as e:
	pass

#
import logging
from pipeline_utils import extract, transform, load

logging.basicConfig(format='%(levelname)s: %(message)s', level=logging.DEBUG)

try:
	raw_tax_data = extract("raw_tax_data.csv")
	clean_tax_data = transform(raw_tax_data)
	load(clean_tax_data, "clean_tax_data.parquet")
    
	logging.info("Successfully extracted, transformed and loaded data.")  # Log a success message.
    
except Exception as e:
	logging.error(f"Pipeline failed with error: {e}")  # Log failure message