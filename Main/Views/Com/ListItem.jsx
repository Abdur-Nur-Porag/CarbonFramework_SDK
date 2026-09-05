const ListItem = ({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  onClick,
  disabled = false,
  customStyles = {}, // Allow overriding container styles
  className = "", // Allow passing additional custom classes
}) => {
  // Define style objects
  const styles = {
    container: {
      display: "flex",
      alignItems: "center",
      minHeight: subtitle ? "72px" : "56px",
      padding: "12px 16px",
      backgroundColor: "#ffffff",
      cursor: disabled ? "default" : "pointer",
      position: "relative",
      overflow: "hidden",
      boxSizing: "border-box",
      WebkitTapHighlightColor: "transparent",
      opacity: disabled ? 0.38 : 1,
      pointerEvents: disabled ? "none" : "auto",
      ...customStyles, // Merge any custom styles passed in
    },
    leftIconWrapper: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginRight: "16px",
      color: "#49454f",
      minWidth: "24px",
    },
    contentWrapper: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      flex: 1,
      overflow: "hidden",
    },
    titleText: {
      fontFamily: "Roboto, sans-serif",
      fontSize: "16px",
      fontWeight: 400,
      lineHeight: "24px",
      color: "#1c1b1f",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    subtitleText: {
      fontFamily: "Roboto, sans-serif",
      fontSize: "14px",
      fontWeight: 400,
      lineHeight: "20px",
      color: "#49454f",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      marginTop: "2px",
    },
    rightIconWrapper: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginLeft: "16px",
      color: "#49454f",
    },
  };

  return (
    <div
      className={`${!disabled ? "android-list-interactive" : ""} ${className}`.trim()}
      style={styles.container}
      onClick={!disabled ? onClick : undefined}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      {/* Left Icon Area */}
      {leftIcon && (
        <div style={styles.leftIconWrapper}>
          {leftIcon}
        </div>
      )}

      {/* Text Content Area */}
      <div style={styles.contentWrapper}>
        <span style={styles.titleText}>
          {title}
        </span>
        {subtitle && (
          <span style={styles.subtitleText}>
            {subtitle}
          </span>
        )}
      </div>

      {/* Right Icon Area */}
      {rightIcon && (
        <div style={styles.rightIconWrapper}>
          {rightIcon}
        </div>
      )}
    </div>
  );
};

export { ListItem };