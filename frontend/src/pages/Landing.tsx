export default function Landing() {
  return (
    <main>
      <h1>tppr</h1>
      <p>Thribhu's Past Paper Repository</p>
      {Basic()}
    </main>
  )
}

"use client";

import {Button} from "@heroui/react";

export function Basic() {
  return <Button onPress={() => console.log("Button pressed")}>Click me</Button>;
}