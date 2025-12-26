import React from "react";
import styles from "./CardShell.module.css";

interface Props {
  title?: string;
  className?: string;
  children: React.ReactNode;
}

const CardShell: React.FC<Props> = ({ title, className, children }) => {
  return (
    <section className={`${styles.card} ${className ?? ""}`}>
      {title ? (
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
        </header>
      ) : null}
      {children}
    </section>
  );
};

export default CardShell;
