import { PersonaImpl } from "../../personas/persona";
// this is the user persona...you never use it, but it makes parsing conversations easier
export const user = PersonaImpl.createBasic("User", "You are the user of the application.");
