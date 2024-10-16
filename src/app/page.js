import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Image src="img/logo.svg" alt="Logo" width={100} height={100} />
      </main>
      <footer className={styles.footer}>
        © 2024 NAHUALstudio
      </footer>
    </div>
  );
}
