ansibleIP=`aws cloudformation list-exports | grep -B 1 AnsibleControllerIP | head -n 1 | sed s/[\ ,\:\"'Value']//g`
isDone=`ssh -i ~/.ssh/DY-Ohio.pem ec2-user@$ansibleIP "grep -e Cloud-init /var/log/cloud-init-output.log | grep -e finished"`

echo "the string length is " ${#isDone}

while [ ${#isDone} -eq 0 ]; do
  sleep 5
  isDone=`ssh -i ~/.ssh/DY-Ohio.pem ec2-user@$ansibleIP "grep -e Cloud-init /var/log/cloud-init-output.log | grep -e finished"`
  echo "Still waiting " $isDone
done

scp -i ~/.ssh/DY-Ohio.pem ~/.ssh/DY-Ohio.pem ec2-user@$ansibleIP:/home/ec2-user/.ssh/DY-Ohio.pem
scp -i ~/.ssh/DY-Ohio.pem ~/.ssh/relus-key.pem ec2-user@$ansibleIP:/home/ec2-user/.ssh/id_rsa
ssh -i ~/.ssh/DY-Ohio.pem ec2-user@$ansibleIP "echo 'SG9zdCAqCiAgU3RyaWN0SG9zdEtleUNoZWNraW5nIG5vCg==' | base64 -d > ~/.ssh/config; chmod 0400 ~/.ssh/config"
ssh -i ~/.ssh/DY-Ohio.pem ec2-user@$ansibleIP "curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.32.0/install.sh | bash"
ssh -i ~/.ssh/DY-Ohio.pem ec2-user@$ansibleIP "[ -s '/home/ec2-user/.nvm/nvm.sh' ] && . '/home/ec2-user/.nvm/nvm.sh'"
ssh -i ~/.ssh/DY-Ohio.pem ec2-user@$ansibleIP ". ~/.nvm/nvm.sh"
ssh -i ~/.ssh/DY-Ohio.pem ec2-user@$ansibleIP "nvm install 6.9.5"
ssh -i ~/.ssh/DY-Ohio.pem ec2-user@$ansibleIP "cd /home/ec2-user; git clone git@github.com:relusdoug/ansible-demo.git"

