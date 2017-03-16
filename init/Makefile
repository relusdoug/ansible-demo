#  User defined variables 
stackName := "DY-Ansible-Demo"
stackS3Bucket := "https://s3.amazonaws.com/relus-doug/"
stackJSONFile := "createAnsibleEnvironment.json"

# Operational variables
#  Either create the stack or update the stack, when JSON file is updated
stackExists := $(shell ls STATEcomplete)
ifeq (STATEcomplete,${stackExists})
stackOperation := update-stack
stackOperationState := stack-update-complete
else
stackOperation := create-stack
stackOperationState := stack-create-complete
endif

# The build rules

STATEcomplete: STATEuploaded
	aws cloudformation ${stackOperation} --stack-name ${stackName} \
		--template-url https://s3.amazonaws.com/relus-doug/createAnsibleEnvironment.json \
    --capabilities CAPABILITY_NAMED_IAM \
		--tags Key=Team,Value='Douglas Yoon' | tee STATEcomplete
	aws cloudformation wait ${stackOperationState} --stack-name ${stackName}
	scp -i ~/.ssh/DY-Ohio.pem ~/.ssh/DY-Ohio.pem ec2-user@`aws cloudformation list-exports | grep -B 1 AnsibleControllerIP | head -n 1 | sed s/[\ ,\:\"'Value']//g`:/home/ec2-user/.ssh/DY-Ohio.pem
	scp -i ~/.ssh/DY-Ohio.pem ~/.ssh/relus-key.pem ec2-user@`aws cloudformation list-exports | grep -B 1 AnsibleControllerIP | head -n 1 | sed s/[\ ,\:\"'Value']//g`:/home/ec2-user/.ssh/id_rsa
	ssh -i ~/.ssh/DY-Ohio.pem ec2-user@`aws cloudformation list-exports | grep -B 1 AnsibleControllerIP | head -n 1 | sed s/[\ ,\:\"'Value']//g` "curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.32.0/install.sh | bash"
	ssh -i ~/.ssh/DY-Ohio.pem ec2-user@`aws cloudformation list-exports | grep -B 1 AnsibleControllerIP | head -n 1 | sed s/[\ ,\:\"'Value']//g` "[ -s '/home/ec2-user/.nvm/nvm.sh' ] && . '/home/ec2-user/.nvm/nvm.sh'"
	ssh -i ~/.ssh/DY-Ohio.pem ec2-user@`aws cloudformation list-exports | grep -B 1 AnsibleControllerIP | head -n 1 | sed s/[\ ,\:\"'Value']//g` ". ~/.nvm/nvm.sh"
	ssh -i ~/.ssh/DY-Ohio.pem ec2-user@`aws cloudformation list-exports | grep -B 1 AnsibleControllerIP | head -n 1 | sed s/[\ ,\:\"'Value']//g` "nvm install 6.9.5"
	ssh -i ~/.ssh/DY-Ohio.pem ec2-user@`aws cloudformation list-exports | grep -B 1 AnsibleControllerIP | head -n 1 | sed s/[\ ,\:\"'Value']//g` "cd /home/ec2-user; git clone git@github.com:relusdoug/ansible-demo.git"


STATEuploaded: createAnsibleEnvironment.json STATEenvCheckedOut
	aws s3 cp createAnsibleEnvironment.json s3://relus-doug
	touch STATEuploaded

STATEenvCheckedOut: 
	aws s3 ls relus-doug
	touch STATEenvCheckedOut

clean:
	rm STATEenvCheckedOut STATEuploaded STATEcomplete

checkInstance:
	aws ec2 describe-instances --filters Name=tag:Name,Values=DY_Ansible_Control

delStack:
	aws cloudformation delete-stack --stack-name ${stackName} 
	rm STATEcomplete

statStack:
	aws cloudformation describe-stack-resources --stack-name ${stackName} 

eventStack:
	aws cloudformation describe-stack-events --stack-name ${stackName} 

copyCreds:
	scp -i ~/.ssh/DY-Ohio.pem ~/.ssh/DY-Ohio.pem ec2-user@`aws cloudformation list-exports | grep -B 1 AnsibleControllerIP | head -n 1 | sed s/[\ ,\:\"'Value']//g`:/home/ec2-user/.ssh/DY-Ohio.pem
	scp -i ~/.ssh/DY-Ohio.pem ~/.ssh/relus-key.pem ec2-user@`aws cloudformation list-exports | grep -B 1 AnsibleControllerIP | head -n 1 | sed s/[\ ,\:\"'Value']//g`:/home/ec2-user/.ssh/id_rsa
