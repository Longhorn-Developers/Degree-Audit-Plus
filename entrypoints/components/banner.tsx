const Banner = (): React.ReactNode => {
	return (
		<div className="fixed top-0 left-0 w-full bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 shadow-lg z-50">
			<div className="text-center">
				<h2 className="text-xl font-bold mb-1">🎓 Degree Audit Plus</h2>
				<p className="text-sm opacity-90">
					Enhanced degree audit experience - Powered by Longhorn Developers
				</p>
			</div>
		</div>
	);
};

export default Banner;
