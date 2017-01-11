# Pillbox
The Duke PillBox app is made of three major components:
- The desktop app wich should be used on the hospital machine.
- The mobile app for the patients.
- The back-end app which should be hosted somewhere and must be accessible by the
  other two.

Although the way this app works should be obvious for the user, there are few things
happening under the hood that probably should be explained here.

1. The desktop app is the first node in the chain. It loads the medications for the selected user,
  allows you to edit them and generates the QR code. However, once you switch to the "View Last Exercise"
  tab it starts to "ask" the back-end service for the statistical data for that patient. Once somebody performs
  any action in the mobile app, it gets recorded in the back-end, thus it should appear in the "View Last Exercise"
  tab.
2. The mobile app will record most of the user's actions at the back-end so that they can be later analyzed.
  It uses special commands for that which are ether triggered bu the patient (for example when he drags and drops meds),
  or can be triggered programatically which is how the "Replay" function works. The recorded actions are:
  - check - when the patient clicks the check button
  - clear - when the patient clicks the clear button
  - help - when the patient opens the help dialog
  - hint - when the patient clicks the hint button
  - moveMedicine - when the patient moves some med from one container to another (including to the recycle bin)
  - toggleHalfPill - when the patient changes the dosage between whole and half pill
  The following actions are not recorded:
  - Print (only available if you use the mobile app on desktop browser)
  - Changing the language
  - Finish - this just "seals" the record and marks the exercise as finished
  - Toggle between full and cropped version of the med titles (when you click on them)
  - Image previews when the patient clicks on the small images
3. The back-end is the just service that connects the other two parts. It acts as storage for the user actions so
  the mobile app "writes to it". And then it provides those records to the desktop app. Additionally, it provides
  the "Translations Manager" which allows the administrator to edit the languages and translations, protects this
  with basic authentication and makes automatic backups when something is edited...

4. Finally, its worth mentioning that even though the pillbox is designed as mobile app, it can be used everywhere -
  outside of it's iOS wrapper, in any Desktop or mobile browser or in typical QR code reader apps.

### Installation
---
This is a typical web app based on HTML/CSS/JS. The only server-side technology
used is NodeJS. Assuming you have the appropriate hosting or machine, you will
have to do the following to install the app:

#### 1. The desktop app
You can use Apache or any other web server. There is nothing special here,
just point your DocumentRoot to the `/build/desktop_app` folder of the
repo and make sure that the server will load your index.html file. Here is an
example virtual host configuration for apache (the one I use on my machine):

```apache
<VirtualHost *:8091>
    ServerAdmin vlad.ignatov@gmail.com
    DocumentRoot "/Users/vlad/dev/pillbox2/build/desktop_app"
    ServerName pillbox-desktop.dev
    <Directory "/Users/vlad/dev/pillbox2/build/desktop_app">
        Options Indexes FollowSymLinks MultiViews
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```


#### 2. The mobile app
The same requirements apply here. The only difference is that it is on separate
domain. The example virtual host looks like this:
```apache
<VirtualHost *:8090>
    ServerAdmin vlad.ignatov@gmail.com
    DocumentRoot "/Users/vlad/dev/pillbox2/build/mobile_app"
    ServerName pillbox-mobile.dev
    <Directory "/Users/vlad/dev/pillbox2/build/mobile_app">
        Options Indexes FollowSymLinks MultiViews
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```
### 3. The back-end
The back-end app is simple but there are few extra steps necessary to make it work.
Assuming that you are on Ubuntu server, here is what you might need to do:
- Install NodeJS:
  ```sh
  curl -sL https://deb.nodesource.com/setup | sudo bash -
  sudo apt-get install -y nodejs
  ```
- Then install pm2 (https://github.com/Unitech/pm2). It is used to start and stop the server and to kep in running
  state (restart after errors, start after system reboot etc.)
  ```js
  sudo npm install pm2 -g
  ```
  This article might also be useful: https://www.digitalocean.com/community/tutorials/how-to-use-pm2-to-setup-a-node-js-production-environment-on-an-ubuntu-vps


- To run the back-end app as a service (substitute the 'username' as needed):
  ```sh
  sudo env PATH=$PATH:/usr/local/bin pm2 startup -u username
  ```

- Finally start the server with:
  ```sh
  pm2 start path/to/pillbox-2.0/backend/index.js
  ```

##Configuration
After the three servers above are prepared you will have to configure the app to reflect your URLs
There are two configuration files.

1. `/build/desktop_app/config.xml` - This file does not exist in the repository.
  It is in fact included in .gitignore so that everyone can maintain his own copy of it. You can copy the
  `/build/desktop_app/config.example.xml` as `/build/desktop_app/config.xml` and then edit it.
  The options are commented inside the file. You will probably have to change `backendHost` and `mobileHost`.
  Make sure they point to the correct locations. The desktop app needs to know the back-end host because it pools
  the statistics for the "View Last Exercise" tab from there. The mobileHost is needed for the QR code generation,
  opening the mobile app in new tab, Replay, Print Pillbox etc.

2. `/build/mobile_app/config.xml` - The same approach here - copy
  `/build/mobile_app/build/config.example.xml` as `/build/mobile_app/build/config.xml` and edit the
  `backendHost` variable to match your location. The mobile app needs to know the backendHost because it attempts
  to save the user actions there.

3. Finally the back-end nodejs app uses configuration from the file `/backend/build/config.json`.
  You might want to change something like the port or username/password for translations.

4. Additional details to consider
  - You might have to create two folders and make sure that Node can write in them:
    - `/backend/records` - will contain one file for each patient that has ever been used
    - `/backend/backups` - will contain backups of the languages and translations (generated when you
    change something in the translations manager)

5. Finally you will have to be able to connect to the SMART service. You will need a SMART client registered via
  https://authorize.smarthealthit.org/ . Then you have to create `launch.html` file at
  `/pillbox-2.0/desktop_app/build/launch.html`. Here is an example   in which you will just have to substitute
  "mypillbox" with whatever your client_id is:
  ```html
  <!DOCTYPE html>
  <html>
    <head>
      <script src="js/fhir-client.min.js"></script>
      <script>
        FHIR.oauth2.authorize({
          "client_id": "mypillbox",
          "scope":  "patient/*.read"
        });
      </script>
    </head>
    <body>Loading...</body>
  </html>
  ```
  You should use the public absolute URL to this file as your launch URL setting for the SMART client and the URL
  pointing to the `/build/desktop_app/build/index.html` file as the redirect URI setting.

## Development
If you want to edit the source code of the back-end app (which is mostly in one file - index.js), then you will have
to restart the nodejs server to "apply" the changes. Something like this should do it:
```sh
pm2 restart 0
```
If you make changes to anything under `/src/`, then custom build will be required. You might have to
install some tools first:
```sh
sudo npm install -g grunt-cli less
cd /path/to/pillbox2
npm install
```
Once you have those, you can build with:
```sh
grunt #for production build
#or
grunt dev #for development build where JS and CSS are not minified
```
Finally, if you intend to do more than just a few changes you can use watch instead and let it rebuild automatically
after you change something:
```sh
grunt watch:prod #for automatic production build
#or
grunt watch:dev #for automatic development build
```
