# Travel Planner

Travel Planner is an app that lets you plan and track your trips. The homescreen has a calendar that displays the events (name and times) of your trip. It allows the user to edit the dates/events to add, delete, or modify events. A dropdown on both screens lets the user choose which trip to display/edit. The journal screen lets the user create notes to journal about their trip.

## Instructions for Build and Use

Steps to build and/or run the software:

1. Open a cmd terminal (can't be a different type) on VS Code
2. Cd into the project folder (TravelPlanner)
3. Type: npx expo start
4. Open the Expo Go app on your phone and open project (through qr code or under Development Servers)
5. Type ctrl c on terminal to stop when you're finished

Instructions for using the software:

1. Use the dropdown in the top left to create a trip (press Create Trip -> enter name -> Create Trip)
2. Double tap a date on the calendar to open it
3. Press edit day -> add information to the Add Event section at the bottom -> Add event -> Done editing
4. Press journal tab on the bottom
5. Press Add entry -> Save entry
6. Select which trip's events and journals you view by selecting it in the top left dropdown
7. Delete an event using the edit day menu -> delete
8. Delete a note by using the Delete button under it, and edit it using the Edit button
9. Delete an trip by swiping left over the trip in the dropdown menu
10. (Pressing on the day once in the calendar displays the events that day beneath the calendar, though you can't edit them)

## Development Environment

To recreate the development environment, you need the following software and/or libraries with the specified versions:

* Node.js LTS (version 20 or later)
* npm (included in Node.js)
* Expo Go App on a phone
* Other Expo stuff (SDK version listed in `package.json`, Expo CLI) is automatically used
* (including: @react-native-async-storage/async-storage (~2.2.0) (run npm install to get, listed in `package.json`))



## Useful Websites to Learn More

I found these websites useful in developing this software:

* How to Create & Apply Custom Icons To A Folder (https://www.wikihow.com/Create-and-Use-Custom-Icons)
* Color Contrast Checker (https://coolors.co/contrast-checker/000000-da6555)
* React Native (https://reactnative.dev/)

## Future Work

The following items I plan to fix, improve, and/or add to this project in the future:

* Let the user create events when creating a new trip, and not just from the edit day menu
* Add the ability to add notes about an event
* Let the user add pictures in the journal section
