# DialogSheet
This is a prebuilt component of Carbon Framework.
## Use Example
```html
<DialogSheet Name="" Elevation="" Size="">
  <!--content-->
</DialogSheet>
```
## Important
If you are making `Android App` you must using Router.
Proper Documention in [Example/Router](Example/Router.md)

Do not use this trigger to open and close or backdrop which is described in this file. Because this file example and providing trigger are non router. So, when you are making android app you must need router. So Read [Example/Router](Example/Router.md)
then use.
## Api
  - openDialogSheet(name)
  - closeDialogSheet(name)
## Reference
  - Name ="your dialog name"
  - Elevation = number(0-10)
  - Size = "small/medium/large/fullscreen"

