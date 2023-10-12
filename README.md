<div align='center'>

<h1>Resgrid Responder Application</h1>
<p>Resgrid Responder App which is small mobile application or PWA to give personnel in a department the options to interact with it. Set staffing, status, respond to calls, send messages, signup for shifts, read docs and more</p>



<h4> <a href=h>View Demo</a> <span> · </span> <a href="https://github.com/Resgrid/Responder/blob/master/README.md"> Documentation </a> <span> · </span> <a href="https://github.com/Resgrid/Responder/issues"> Report Bug </a> <span> · </span> <a href="https://github.com/Resgrid/Responder/issues"> Request Feature </a> </h4>


</div>

# :notebook_with_decorative_cover: Table of Contents

- [About the Project](#star2-about-the-project)
- [Roadmap](#compass-roadmap)
- [FAQ](#grey_question-faq)
- [License](#warning-license)


## :star2: About the Project

### :camera: Screenshots




### :dart: Features
- Directed at Personnel and the Phone form factor
- Set your Personal Status and Staffing Level
- Get Call Information and update, close and create calls
- Get Shift Information and signup for Shifts
- View the Department Calendar and Signup to Events
- Send and Receive Messages


### :key: Environment Variables
To run this project, you will need to add the following environment variables to your .env file
`baseApiUrl`

`resgridApiUrl`

`channelUrl`

`channelHubName`

`realtimeGeolocationHubName`

`logLevel`

`isDemo`

`demoToken`

`loggingKey`

`appKey`



## :toolbox: Getting Started

### :gear: Installation

Install Deps
```bash
npm ci
```
Build App
```bash
npm run build
```
Start Local Sim
```bash
npm run start
```
To copy web assets to native projects
```bash
npx cap sync
```


### :running: Run Locally

Clone the project

```bash
https://github.com/Resgrid/Responder
```
Go to project directory
```bash
cd Responder
```
Install dependencies
```bash
npm ci
```
Start the web server
```bash
npm run start
```


## :compass: Roadmap

* [x] Open Source Responder App


## :grey_question: FAQ

- Can I deploy the Responder App to Google Play or the Apple App Store
- You can but you cannot inclue "Resgrid" in the name of your application in the name of the application or the store listing.
- What Do I need to Change to Deploy the Responder App to the stores
- You will need to search for all occurrences of com.wavetech.Resgrid" or "wtdt.wavetech.Resgrid" and replace it with your app id. You will need to replace the icons, logos, splash screen images with your own.


## :warning: License

Distributed under the Apache License 2.0. See LICENSE.txt for more information.