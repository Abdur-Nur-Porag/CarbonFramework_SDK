# Fab (Floating Action Button)

FABs represent the primary action of a screen. This component supports expandable FABs with multiple sub-actions.

## Use Example
```jsx
   <Fab name="MainFab">
        <FabBody>
            <FabItem>Create New <FabSpace></FabSpace> 📝</FabItem>
            <FabItem>Upload File <FabSpace></FabSpace> ☁️</FabItem>
            <FabItem>Settings <FabSpace></FabSpace> ⚙️</FabItem>
        </FabBody>
        <FabButton></FabButton>
    </Fab>
    
```

## Structure Define:
1.  **fab** = The main container.
2.  **fabbutton** = The primary floating button.
3.  **fabitem** = Sub-action items that appear when the FAB is clicked.
## Event
For event you can use `event` method of [Carbon Build Api](Example/Core_JavaScript/md/Carbon_Build_Api.md)
Example:
```jsx
<Fab name="MainFab">
        <FabBody>
            <FabItem id="goHome">
            	Home
            </FabItem>
        </FabBody>
        <FabButton></FabButton>
    </Fab>
```

```js
$("#goHome").event("click",()=>{
//here is opratiom
})
```
#verified 