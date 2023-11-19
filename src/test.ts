import { SarcIdentifier } from "./formats/archives/sarc/identifier";
import { SarcHeader, SimpleArchive } from "./formats/archives/sarc";
import { Endianness, Option, StringIdentifier, SystemFolder } from "nnfileabstraction";

(async() => {
  const sarc = await SystemFolder.at(".")
    .map(x => x.get(new StringIdentifier("layout.lyarc.pack")))
    .map(x => x.expectFile())
    .map(x => x.open())
    .map(SimpleArchive.load)

  const r = sarc.async()
    .zip(sarc => sarc.hash("timg/__Combined.bntx"))
    .map(([sarc, hash]) => sarc.get(hash))
    .map(f => f.getFileData())

  console.log(await r);
})()
