const Switch = ({
  checked = false,
  onChange,
  disabled = false,
  customStyles = {},
  className = "",
}) => {
  const styles = {
    container: {
      display: "inline-flex",
      alignItems: "center",
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.38 : 1,
      pointerEvents: disabled ? "none" : "auto",
      ...customStyles,
    },
    track: {
      width: "48px",
      height: "24px",
      borderRadius: "12px",
      backgroundColor: checked ? "#1a73e8" : "#d1d1d6", // Material Blue when checked, Grey when unchecked
      position: "relative",
      display: "flex",
      alignItems: "center",
      padding: "2px",
      boxSizing: "border-box",
      transition: "background-color 0.2s ease-in-out",
    },
    thumb: {
      width: "20px",
      height: "20px",
      borderRadius: "50%",
      backgroundColor: "#ffffff",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)", // Adds depth to the toggle knob
      transform: checked ? "translateX(24px)" : "translateX(0)", // 48(width) - 4(padding) - 20(thumb size) = 24px
      transition: "transform 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)", // Native snappy feel
    },
  };

  return (
    <div
      className={className}
      style={styles.container}
      onClick={!disabled ? onChange : undefined}
      role="switch"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
    >
      <div style={styles.track}>
        <div style={styles.thumb} />
      </div>
    </div>
  );
};

export { Switch };