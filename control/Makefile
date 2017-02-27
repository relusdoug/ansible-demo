#  User defined variables 
stackName := "DY-Ansible-Demo-AppStack"
stackS3Bucket := "https://s3.amazonaws.com/relus-doug/"
stackJSONFile := "createApplicationEnvironment.json"

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
		--template-url https://s3.amazonaws.com/relus-doug/createApplicationEnvironment.json \
		--tags Key=Team,Value='Douglas Yoon' | tee STATEcomplete

STATEuploaded: createApplicationEnvironment.json STATEenvCheckedOut
	aws s3 cp createApplicationEnvironment.json s3://relus-doug
	touch STATEuploaded

STATEenvCheckedOut: 
	aws s3 ls relus-doug
	touch STATEenvCheckedOut

clean:
	rm STATEenvCheckedOut STATEuploaded STATEcomplete

delStack:
	aws cloudformation delete-stack --stack-name ${stackName} 
	rm STATEcomplete

listEvents:
	aws cloudformation describe-stack-events --stack-name DY-Ansible-Demo-AppStack

statStack:
	aws cloudformation describe-stack-resources --stack-name ${stackName} 

