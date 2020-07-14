# Bitbucket Quay Connector
## Overview
This software provides middleware for self hosted instances of
[Bitbucket](https://bitbucket.org), Atlassian's version control repository, to
make webhook calls to [Quay](https://access.redhat.com/products/red-hat-quay),
RedHat's container image registry. This project is built with
[appsody](https://appsody.dev/docs).

### Environmental Variables
These need to be set when your final appsody container is deployed.

`QUAY_HOST` Required - the url for your quay host (example: quay-host.com).

`QUAY_CA_FILE` Optional - If Quay's root CA is not publically signed, you'll
need to set this to the name of the cert.pem that you've added to the root of
this project. (example: QUAY_CA_FILE=ExampleRootCA.pem)

### How it Works
The application will forward your request to your `QUAY_HOST` environment
variable i.e.
https://your.initial.url/webhooks/push/trigger/id?token=yourtoken
will forward to:
https://$token:yourtoken@your.quay.url/webhooks/push/trigger/id
with a POST request

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
- If you need to trust a Root CA, copy it to the repository root directory.
- Run `appsody build` - This builds a container image that you can push.

### Configuring Bitbucket
You'll need to add a webhook that points to your newly built container image,
either with the FQDN or the IP address and then add the `/api` Endpoint.
Example: https://192.168.1.101:3000/api or
https://bitbucket-quay-connector.cloudapps.master.ose/api.

You will also need to add the
SSH Public Key that Quay recreated to your repo as part of  the
[Custom Git Repository Push Build Trigger](https://docs.quay.io/guides/custom-trigger.html).

## Running the docker image
If you build the appsody image with `appsody build --tag bitbucket-quay-connector` then you can run the image you've created
with `docker run --name bitbucket-quay-connector -d -p 3000:3000 bitbucket-quay-connector`
This would allow you to use the connector at http://localhost:3000/api for the Bitbucket webhook url. (You would need to to replace localhost with your machines's local IP address like http://192.168.1.100:3000/api)
