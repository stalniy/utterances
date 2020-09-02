import {
  Issue,
  setRepoContext,
  loadIssueByNumber,
  loadCommentsPage,
  loadUser,
  postComment,
  IssueComment
} from './services/github';
import { PAGE_SIZE } from './config';
import { TimelineComponent } from './components/timeline-component';
import { NewCommentComponent } from './components/new-comment-component';
import { loadToken } from './oauth';
import { enableReactions } from './reactions';

interface RenderOptions {
  owner: string
  repo: string
  issueNumber: number
}

export async function renderComponent(root: Element, options: RenderOptions) {
  setRepoContext(options);
  await loadToken();

  const [issue, user] = await Promise.all([
    loadIssueByNumber(options.issueNumber),
    loadUser(),
  ]);
  const currentUrl = window.location.href;
  const timeline = new TimelineComponent(user, issue, currentUrl);

  if (issue && issue.comments > 0) {
    renderComments(issue, timeline);
  }

  root.appendChild(timeline.el);

  if (issue && issue.locked) {
    return;
  }

  enableReactions(!!user);

  const submit = async (markdown: string) => {
    const comment = await postComment(issue!.number, markdown);
    timeline.insertComment(comment, true);
    newCommentComponent.clear();
  };

  const newCommentComponent = new NewCommentComponent(user, submit, currentUrl);
  timeline.el.appendChild(newCommentComponent.el);
}

async function renderComments(issue: Issue, timeline: TimelineComponent) {
  const render = (comments: IssueComment[]) => {
    comments.forEach(comment => timeline.insertComment(comment, false));
  };

  const pageCount = Math.ceil(issue.comments / PAGE_SIZE);
  // always load the first page.
  const pageLoads = [loadCommentsPage(issue.number, 1)];
  // if there are multiple pages, load the last page.
  if (pageCount > 1) {
    pageLoads.push(loadCommentsPage(issue.number, pageCount));
  }
  // if the last page is small, load the penultimate page.
  if (pageCount > 2 && issue.comments % PAGE_SIZE < 3) {
    pageLoads.push(loadCommentsPage(issue.number, pageCount - 1));
  }
  // await all loads to reduce jank.
  const pages = await Promise.all(pageLoads);
  pages.forEach(render);

  // enable loading hidden pages.
  let hiddenPageCount = pageCount - pageLoads.length;
  let nextHiddenPage = 2;
  const renderLoader = (comments: IssueComment[]) => {
    if (hiddenPageCount === 0) {
      return;
    }
    const load = async () => {
      loader.setBusy();
      const comments = await loadCommentsPage(issue.number, nextHiddenPage);
      loader.remove();
      render(comments);
      hiddenPageCount--;
      nextHiddenPage++;
      renderLoader(comments);
    };
    const afterComment = comments.pop()!;
    const loader = timeline.insertPageLoader(afterComment, hiddenPageCount * PAGE_SIZE, load);
  };
  renderLoader(pages[0]);
}
