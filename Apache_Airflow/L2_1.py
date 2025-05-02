# operators - single task in a workflow
from airflow import DAG

# Bash Operator
from airflow.operators.bash import BashOperator

BashOperator(
    task_id='print_date',
    bash_command='echo 1',
    dag=dag
)


#
with DAG(dag_id="test_dag", default_args={"start_date": "2024-01-01"}) as analytics_dag:
  # Define the BashOperator 
  cleanup = BashOperator(
      task_id='cleanup_task',
      # Define the bash_command
      bash_command='cleanup.sh',
  )

#
# Define a second operator to run the `consolidate_data.sh` script
consolidate = BashOperator(
    task_id='consolidate_task',
    bash_command='consolidate_data.sh'
    )

# Define a final operator to execute the `push_data.sh` script
push_data = BashOperator(
    task_id='pushdata_task',
    bash_command='push_data.sh'
    )
