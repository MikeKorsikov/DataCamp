# DAG - Directed Acyclic Graph

# Import the DAG object
from airflow import DAG

# Define the default_args dictionary
default_args = {
  'owner': 'dsmith',
  'start_date': datetime(2023, 1, 14),
  'retries': 2
}

# Instantiate the DAG object
with DAG('example_etl', default_args=default_args) as etl_dag:
  pass