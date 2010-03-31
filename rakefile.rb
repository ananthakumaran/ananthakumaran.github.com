task :default => :dev

desc 'Notify Google of the new sitemap'
task :sitemap do
  begin
    require 'net/http'
    require 'uri'
    puts '* Pinging Google about our sitemap'
	proxy_class = Net::HTTP::Proxy('proxy.karunya.edu', 3128)
    proxy_class.get('www.google.com', '/webmasters/tools/ping?sitemap=' + URI.escape('http://ananthakumaran.github.com/sitemap.xml'))
  rescue LoadError
    puts '! Could not ping Google about our sitemap, because Net::HTTP or URI could not be found.'
  end
end
 
desc 'Run Jekyll in development mode'
task :dev do
  puts '* Running Jekyll with auto-generation and server'
  puts `jekyll --auto --server`
end
 
desc 'Push source code to Github'
task :push do
  puts '* Pushing to Github'
  puts `git push github master`
end