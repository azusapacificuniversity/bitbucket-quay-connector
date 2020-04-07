# Bitbucket Quay Connector
## Overview
This software provides middleware for self hosted instances of
[Bitbucket](https://bitbucket.org), Atlassian's version control repository, to
make webhook calls to [Quay](https://access.redhat.com/products/red-hat-quay),
RedHat's container image registry. This project is built with
[appsody](https://appsody.dev/docs).
## Configuration
You need to configure the config.json with the name of the Bitbucket repo (key)
and the URL that quay needs you to post to as the value. The webhook will throw
an error if this is not configured properly.

You should also note that when using the "test"  button while setting up the
webhook from Bitbucket, do not include testing the quay server link in the
config.json, or the required secret configuration.

### Environmental Variables
These need to be set when your final appsody container is deployed.

`SERVER_SECRET` Required - Also needs to be set in your Bitbucket webhook.

`QUAY_CA_FILE` Optional - If Quay's root CA is not publically signed, you'll
need to set this to the name of the cert.pem that you've added to the root of
this project. (example: QUAY_CA_FILE=ExampleRootCA.pem)

### Building the Appsody Project:
You can read all about building and deploying Appsody projects
[here](https://appsody.dev/docs/using-appsody/building-and-deploying/), but for
the scope of this project we'll only cover generating and obtaining a
container image for use with whatever container system you use.  
Here are the steps you'll take:
- [Install Appsody](https://appsody.dev/docs/installing/installing-appsody)
- Clone this repository, and change it to your current working directory.
- Create a new repository in quay and add a
[Custom Git Repository Push Build Trigger](https://docs.quay.io/guides/custom-trigger.html). Copy the Webhook Endpoint URL.
- Edit the `config.json` to have your Bitbucket repo name and the Webhook
Endpoint URL you created in the previous step.
- If you need to trust a Root CA, copy it to the repository root directory.
- Run `appsody build` - This builds a container image that you can push.

### Configuring Bitbucket
You'll need to add a webhook that points to your newly built container image,
either with the FQDN or the IP address and then add the `/api` Endpoint.
Example: https://192.168.1.101:3000/api or
https://bitbucket-quay-connector.cloudapps.master.ose/api After that be sure to
add the string you set for the `SERVER_SECRET`.

You will also need to add the
SSH Public Key that Quay recreated to your repo as part of  the
[Custom Git Repository Push Build Trigger](https://docs.quay.io/guides/custom-trigger.html).
