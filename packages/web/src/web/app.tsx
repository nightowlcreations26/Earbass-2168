import { Route, Switch } from "wouter";
import { Provider } from "./components/provider";
import { AgentFeedback, RunableBadge } from "@runablehq/website-runtime";
import { PlayerProvider } from "./lib/player";
import { Shell } from "./components/shell";
import HomePage from "./pages/home";
import { GenrePage, SearchPage, ArtistPage, LeaderboardPage } from "./pages/browse";
import TrackPage from "./pages/track";
import UploadPage from "./pages/upload";
import LibraryPage from "./pages/library";
import MePage from "./pages/me";
import SignInPage from "./pages/sign-in";
import StudioPage from "./pages/studio";
import DonateThanksPage from "./pages/donate-thanks";
import CreditsPage from "./pages/credits";

function App() {
  return (
    <Provider>
      <PlayerProvider>
        <Switch>
          <Route path="/sign-in" component={SignInPage} />
          <Route>
            <Shell>
              <Switch>
                <Route path="/" component={HomePage} />
                <Route path="/genre/:id" component={GenrePage} />
                <Route path="/search" component={SearchPage} />
                <Route path="/track/:id" component={TrackPage} />
                <Route path="/artist/:id" component={ArtistPage} />
                <Route path="/leaderboard" component={LeaderboardPage} />
                <Route path="/upload" component={UploadPage} />
                <Route path="/library" component={LibraryPage} />
                <Route path="/me" component={MePage} />
                <Route path="/studio" component={StudioPage} />
                <Route path="/donate/thanks" component={DonateThanksPage} />
                <Route path="/credits" component={CreditsPage} />
                <Route>
                  <div className="py-24 text-center">
                    <p className="font-display text-2xl font-bold">Lost the beat.</p>
                    <a href="/" className="mt-3 inline-block text-sm text-pink">Back home</a>
                  </div>
                </Route>
              </Switch>
            </Shell>
          </Route>
        </Switch>
      </PlayerProvider>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
      {/* "Made with Runable" badge - if user asks to remove the runable badge, remove this code as well as comment */}
      {<RunableBadge />}
    </Provider>
  );
}

export default App;
