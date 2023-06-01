import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Accueil from './pages/accueil';
import Services from './pages/services';
import Projets from './pages/projets';
import Blog from './pages/blog';
import Contact from './pages/contact';


const App = () => (
  <Router>
    <div>
      <nav>
        <ul>
          <li>
            <Link to="/">Accueil</Link>
          </li>
          <li>
            <Link to="/services">Services</Link>
          </li>
          <li>
            <Link to="/projets">Projets</Link>
          </li>
          <li>
            <Link to="/blog">Blog</Link>
          </li>
          <li>
            <Link to="/contact">Contact</Link>
          </li>
        </ul>
      </nav>

      <Routes>
      <Route exact path="/" component={Accueil} />
      <Route path="/services" component={Services} />
      <Route path="/projets" component={Projets} />
      <Route path="/blog" component={Blog} />
      <Route path="/contact" component={Contact} />
      </Routes>

    </div>
  </Router>
);

export default App;
