import { SarcHeader } from "./formats/archives/sarc";
import { Endianness, StringIdentifier, SystemFolder } from "nnfileabstraction";

(async() => {
  const sarc = await SystemFolder.at(".")
      .map(x => x.get(new StringIdentifier("layout.lyarc.pack")))
      .map(x => x.expectFile())
      .map(x => x.open())
      .map(SarcHeader.deserializeBomFuture)
      .map(h => h.assertValid(h));

  let sarcHeader = sarc.unwrap();
  console.log(sarcHeader);
})()
