#  User defined variables 
stackName := "DY-Ansible-Demo"
stackS3Bucket := "https://s3.amazonaws.com/relus-doug/"
stackJSONFile := "createAnsibleEnvironment.json"

# Operational variables
#  Either create the stack or update the stack, when JSON file is updated
stackExists := $(shell ls STATEcomplete)
ifeq (STATEcomplete,${stackExists})
stackOperation := update-stack
else
stackOperation := create-stack
endif

# The build rules

STATEcomplete: STATEuploaded
	aws cloudformation ${stackOperation} --stack-name ${stackName} \
		--template-url https://s3.amazonaws.com/relus-doug/createAnsibleEnvironment.json \
    --capabilities CAPABILITY_NAMED_IAM \
		--tags Key=Team,Value='Douglas Yoon' | tee STATEcomplete

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
