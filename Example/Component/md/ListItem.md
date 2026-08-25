## ListItem
### Installation
```jsx
import { ListItem } from './Com/ListItem';
```

### Use
Basic Use
```jsx

<ListItem 
  title="Display Settings" 
  onClick={() => console.log('Clicked!')} 
/>
```
Complex Example

```jsx
<ListItem
  title="Wi-Fi"
  subtitle="Connected to AndroidAP"
  leftIcon={<span>📶</span>}
  rightIcon={<span>⚙️</span>}
  onClick={() => alert("Opening Wi-Fi settings")}
/>
```

Disable Example

```jsx
<ListItem
  title="Developer Options"
  subtitle="Not available for this user"
  leftIcon={<span>🛠️</span>}
  disabled={true}
  onClick={() => console.log("This will not fire")}
/>
```


Custom Styling
```jsx

<ListItem
  title="Storage"
  subtitle="75% used - 32GB free"
  customStyles={{ borderBottom: "1px solid #e0e0e0" }}
/>
```

### Attribute
	- title = String || node || html
	- subtitle = String || node || html
	- leftIcon = node || svg || html
	- rightIcon = node || svg || html
	- onClick = function
	- disabled = boolean 
	- customStyle = obj
	- className = string 
