# Main
Carbon Framework Every PageView contents run inside `App` container.
## Basic Syntex
```jsx
function ExampleView(){
	
	return(
	<PageView>
		<App>
			<AppBar>
				{/**/}
			</AppBar>
			<AppBody>
				{/**/}
			</AppBody>
			<BottomBar>
				{/**/}
			</BottomBar>
		</App>
	</PageView>
	);
}
```
## Attribute Definition
### AppBar

| Name | Type   | Value       | Example            |
| ---- | ------ | ----------- | ------------------ |
| Type | String | Transparent | Type="Transparent" |
### AppBody


| Name | Type   | Value       | Example            |
| ---- | ------ | ----------- | ------------------ |
|ScrollBar| Boolean | true/false | ScrollBar="true"|
|Type| String | VScroll/HScroll/Both|Type="VScroll"|
|OverScrollEffect| Boolean |true/false|OverScrollEffect="true"|
|OverScrollEffectColor|String|RGB/Hax/Color name|OverScrollEffectColor="var(--primary)"|
|OverScrollStretchEffect|Boolean|true/false|OverScrollStretchEffect="true"|

### BottomBar

| Name | Type   | Value       | Example            |
| ---- | ------ | ----------- | ------------------ |
| Type | String | Transparent | Type="Transparent" |


